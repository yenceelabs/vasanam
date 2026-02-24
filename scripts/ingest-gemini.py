#!/usr/bin/env python3
"""
Vasanam — Gemini Audio API Tanglish Transcription Pipeline
Downloads Tamil movie scene audio from YouTube and transcribes in Tanglish
using Google Gemini 2.0 Flash Audio API.

Usage:
  python3 scripts/ingest-gemini.py --url "https://youtube.com/watch?v=xFMJWJVLJxQ" --title "VIP" --year 2014
  python3 scripts/ingest-gemini.py --batch          # run all 5 seed URLs
  python3 scripts/ingest-gemini.py --url URL --dry-run  # transcribe only, skip Supabase

Requirements:
  pip install google-generativeai supabase yt-dlp
  apt/brew install ffmpeg  (for audio conversion)

Environment (auto-loaded from config/environments/production.json):
  GEMINI_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
"""

import os
import sys
import json
import time
import argparse
import tempfile
import subprocess
import re
from pathlib import Path

# ─── Load credentials from production.json ─────────────────────────────────
def load_credentials():
    """Load API keys from clawd production.json"""
    config_path = Path(__file__).parent.parent.parent / "config" / "environments" / "production.json"
    if not config_path.exists():
        # Try alternate path (when running from clawd root)
        config_path = Path.home() / "clawd" / "config" / "environments" / "production.json"
    
    if config_path.exists():
        with open(config_path) as f:
            cfg = json.load(f)
        
        if not os.environ.get("GEMINI_API_KEY"):
            os.environ["GEMINI_API_KEY"] = cfg.get("gemini", {}).get("apiKey", "")
        if not os.environ.get("SUPABASE_URL"):
            os.environ["SUPABASE_URL"] = cfg.get("supabase", {}).get("url", "")
        if not os.environ.get("SUPABASE_SERVICE_KEY"):
            os.environ["SUPABASE_SERVICE_KEY"] = cfg.get("supabase", {}).get("serviceRoleKey", "")

load_credentials()

from google import genai
from google.genai import types as genai_types
from supabase import create_client

# ─── Seed batch: 5 approved YouTube scene clips ────────────────────────────
SEED_BATCH = [
    {
        "url": "https://www.youtube.com/watch?v=xFMJWJVLJxQ",
        "title": "VIP",
        "title_tamil": "வேலை இல்ல பட்டதாரி",
        "year": 2014,
        "actors": ["Dhanush", "Kajal Aggarwal"],
        "director": "Velraj",
        "description": "Amul Baby vs Raghuvaran scene",
    },
    {
        "url": "https://www.youtube.com/watch?v=KrC8ye3adAM",
        "title": "Beast",
        "title_tamil": "பீஸ்ட்",
        "year": 2022,
        "actors": ["Vijay", "Pooja Hegde", "Yogi Babu"],
        "director": "Nelson Dilipkumar",
        "description": "Vijay Beast Mode + Yogi Babu comedy",
    },
    {
        "url": "https://www.youtube.com/watch?v=OKBMCL-frPU",
        "title": "Vikram",
        "title_tamil": "விக்ரம்",
        "year": 2022,
        "actors": ["Kamal Haasan", "Vijay Sethupathi", "Fahadh Faasil"],
        "director": "Lokesh Kanagaraj",
        "description": "Official trailer — dialogue-heavy",
    },
    {
        "url": "https://www.youtube.com/watch?v=k5fc1xe5n5k",
        "title": "Osthe",
        "title_tamil": "ஓஸ்தே",
        "year": 2011,
        "actors": ["Silambarasan", "Richa Gangopadhyay", "Nassar"],
        "director": "Dharani",
        "description": "Simbu emotional scene with Nassar",
    },
    {
        "url": "https://www.youtube.com/watch?v=v-BOLba0P5o",
        "title": "Vijay Punch Dialogues",
        "title_tamil": "விஜய் punch dialogues",
        "year": 2023,
        "actors": ["Vijay"],
        "director": "Various",
        "description": "Vijay punch dialogues compilation (Sun NXT)",
    },
]

TANGLISH_PROMPT = """You are transcribing Tamil movie dialogue audio.

TASK: Transcribe every spoken word in this audio as Tanglish.

TANGLISH RULES:
- Romanize Tamil words phonetically as they sound (e.g., "naan" not "nan", "paaru" not "paru")
- Keep English words exactly as spoken in English
- Preserve code-switching naturally (Tamil → English mid-sentence is common)
- Include character names as spoken
- Capture emotional tone words (ayyo, da, di, machan, dei, ba, etc.)
- Skip music, background noise, non-speech
- One entry per natural phrase/sentence (2-10 seconds each)

OUTPUT FORMAT (JSON array only, no markdown):
[
  {"start_seconds": 0.0, "end_seconds": 3.5, "text": "naan romba tired-a irukken da"},
  {"start_seconds": 3.5, "end_seconds": 7.0, "text": "enna pannuvom sollu machan"}
]

IMPORTANT:
- Output ONLY the JSON array, nothing else
- If you cannot transcribe clearly, skip that segment
- Minimum 3 characters per text entry
"""

def find_yt_dlp() -> str:
    """Find yt-dlp binary — checks PATH and common pyenv locations"""
    import shutil
    # Check PATH first
    found = shutil.which("yt-dlp")
    if found:
        return found
    # Check pyenv locations
    pyenv_paths = [
        "/.sprite/languages/python/pyenv/versions/3.13.7/bin/yt-dlp",
        os.path.expanduser("~/.pyenv/shims/yt-dlp"),
        os.path.expanduser("~/.local/bin/yt-dlp"),
        "/usr/local/bin/yt-dlp",
    ]
    for p in pyenv_paths:
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return "yt-dlp"  # fallback — will raise FileNotFoundError with good message


def download_audio(url: str, output_dir: str) -> str | None:
    """Download audio from YouTube URL using yt-dlp"""
    print(f"  📥 Downloading audio from: {url}")
    
    output_template = os.path.join(output_dir, "%(id)s.%(ext)s")
    yt_dlp_bin = find_yt_dlp()
    
    # Try to download audio only (m4a/webm/opus preferred — no ffmpeg needed for these)
    cmd = [
        yt_dlp_bin,
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "5",  # ~128kbps — enough for speech
        "--output", output_template,
        "--no-playlist",
        "--quiet",
        "--no-warnings",
        url,
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            # Fallback: download best audio without conversion (no ffmpeg needed)
            cmd_fallback = [
                yt_dlp_bin,
                "-f", "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
                "--output", output_template,
                "--no-playlist",
                "--quiet",
                "--no-warnings",
                url,
            ]
            result2 = subprocess.run(cmd_fallback, capture_output=True, text=True, timeout=300)
            if result2.returncode != 0:
                print(f"  ❌ yt-dlp failed: {result.stderr.strip() or result2.stderr.strip()}")
                return None
    except subprocess.TimeoutExpired:
        print("  ❌ Download timed out after 5 minutes")
        return None
    except FileNotFoundError:
        print(f"  ❌ yt-dlp not found at '{yt_dlp_bin}'. Install with: pip install yt-dlp")
        return None
    
    # Find downloaded file
    files = list(Path(output_dir).glob("*.*"))
    audio_extensions = {'.mp3', '.m4a', '.webm', '.opus', '.ogg', '.wav', '.flac', '.aac'}
    audio_files = [f for f in files if f.suffix.lower() in audio_extensions]
    
    if not audio_files:
        print(f"  ❌ No audio file found in {output_dir}")
        print(f"     Files present: {[f.name for f in files]}")
        return None
    
    audio_path = str(audio_files[0])
    file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
    print(f"  ✅ Downloaded: {audio_files[0].name} ({file_size_mb:.1f} MB)")
    return audio_path


def transcribe_with_gemini(audio_path: str, api_key: str) -> list[dict]:
    """Upload audio to Gemini and transcribe as Tanglish"""
    print(f"  🧠 Sending to Gemini 2.0 Flash for Tanglish transcription...")
    
    client = genai.Client(api_key=api_key)
    
    # Upload file to Gemini Files API
    print(f"  📤 Uploading audio file to Gemini Files API...")
    mime_type_map = {
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.webm': 'audio/webm',
        '.opus': 'audio/ogg',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.aac': 'audio/aac',
    }
    ext = Path(audio_path).suffix.lower()
    mime_type = mime_type_map.get(ext, 'audio/mpeg')
    
    with open(audio_path, 'rb') as f:
        uploaded_file = client.files.upload(
            file=f,
            config=genai_types.UploadFileConfig(mime_type=mime_type)
        )
    print(f"  ⏳ Waiting for file processing...")
    
    # Wait for file to be ready
    max_wait = 120
    waited = 0
    while uploaded_file.state.value == "PROCESSING" and waited < max_wait:
        time.sleep(3)
        waited += 3
        uploaded_file = client.files.get(name=uploaded_file.name)
    
    if uploaded_file.state.value != "ACTIVE":
        print(f"  ❌ File processing failed: {uploaded_file.state}")
        return []
    
    print(f"  ✅ File ready. Running transcription...")
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                genai_types.Part.from_uri(
                    file_uri=uploaded_file.uri,
                    mime_type=mime_type
                ),
                TANGLISH_PROMPT,
            ],
            config=genai_types.GenerateContentConfig(
                temperature=0.1,   # Low temp for accurate transcription
                max_output_tokens=32768,  # Long compilations need more tokens
            )
        )
        
        # Clean up uploaded file
        client.files.delete(name=uploaded_file.name)
        
        text = response.text.strip()
        
        # Parse JSON response — strip markdown code blocks if present
        text = re.sub(r'^```(?:json)?\n?', '', text, flags=re.MULTILINE)
        text = re.sub(r'\n?```$', '', text, flags=re.MULTILINE)
        text = text.strip()
        
        segments = json.loads(text)
        print(f"  ✅ Transcribed {len(segments)} dialogue segments")
        return segments
        
    except json.JSONDecodeError as e:
        raw = response.text if response.text else 'empty'
        print(f"  ❌ JSON parse error: {e}")
        print(f"     Raw response (first 500 chars): {raw[:500]}")
        # Try to salvage partial JSON array
        try:
            match = re.search(r'\[.*?\]', raw, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception:
            pass
        return []
    except Exception as e:
        print(f"  ❌ Gemini error: {e}")
        return []


def detect_language(text: str) -> str:
    tamil_re = re.compile(r'[\u0B80-\u0BFF]')
    if tamil_re.search(text):
        return 'tamil'
    english_ratio = len(re.findall(r'[a-zA-Z]', text)) / max(len(text), 1)
    if english_ratio > 0.85:
        return 'english'
    return 'tanglish'


def upsert_to_supabase(supabase, movie_info: dict, youtube_url: str, segments: list[dict]) -> dict:
    """Upsert movie + segments to Supabase"""
    
    # Extract video ID from URL
    video_id_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', youtube_url)
    if not video_id_match:
        print(f"  ❌ Could not extract video ID from URL: {youtube_url}")
        return {"success": False, "segments": 0}
    
    youtube_video_id = video_id_match.group(1)
    
    # Upsert movie
    movie_data = {
        "title": movie_info["title"],
        "title_tamil": movie_info.get("title_tamil"),
        "year": movie_info["year"],
        "youtube_video_id": youtube_video_id,
        "actors": movie_info.get("actors", []),
        "director": movie_info.get("director"),
    }
    
    result = supabase.table("vasanam_movies").upsert(
        movie_data,
        on_conflict="youtube_video_id"
    ).execute()
    
    if not result.data:
        print(f"  ❌ Failed to upsert movie record")
        return {"success": False, "segments": 0}
    
    movie_id = result.data[0]["id"]
    print(f"  📝 Movie upserted: {movie_info['title']} (id: {movie_id})")
    
    if not segments:
        print(f"  ⚠️  No segments to insert")
        return {"success": True, "segments": 0}
    
    # Delete existing segments for this movie
    supabase.table("vasanam_segments").delete().eq("movie_id", movie_id).execute()
    
    # Convert segments format: {start_seconds, end_seconds, text} → {start_ms, duration_ms, text}
    rows = []
    for seg in segments:
        text = seg.get("text", "").strip()
        if not text or len(text) < 3:
            continue
        
        start_ms = int(float(seg.get("start_seconds", 0)) * 1000)
        end_ms = int(float(seg.get("end_seconds", start_ms / 1000 + 3)) * 1000)
        duration_ms = max(end_ms - start_ms, 500)
        
        rows.append({
            "movie_id": movie_id,
            "text": text,
            "start_ms": start_ms,
            "duration_ms": duration_ms,
            "language": detect_language(text),
        })
    
    # Batch insert in chunks of 500
    BATCH_SIZE = 500
    total_inserted = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        supabase.table("vasanam_segments").insert(batch).execute()
        total_inserted += len(batch)
    
    print(f"  ✅ Inserted {total_inserted} segments into Supabase")
    return {"success": True, "segments": total_inserted}


def process_single(url: str, title: str, year: int, title_tamil: str = None,
                   actors: list = None, director: str = None, dry_run: bool = False):
    """Process a single YouTube URL"""
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set")
        sys.exit(1)
    
    supabase = None
    if not dry_run:
        supa_url = os.environ.get("SUPABASE_URL")
        supa_key = os.environ.get("SUPABASE_SERVICE_KEY")
        if not supa_url or not supa_key:
            print("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required (or use --dry-run)")
            sys.exit(1)
        supabase = create_client(supa_url, supa_key)
    
    movie_info = {
        "title": title,
        "title_tamil": title_tamil,
        "year": year,
        "actors": actors or [],
        "director": director,
    }
    
    print(f"\n🎬 Processing: {title} ({year})")
    print(f"   URL: {url}")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Step 1: Download audio
        audio_path = download_audio(url, tmpdir)
        if not audio_path:
            print(f"  ❌ Skipping {title} — download failed")
            return {"success": False, "segments": 0}
        
        # Step 2: Transcribe with Gemini
        segments = transcribe_with_gemini(audio_path, api_key)
        if not segments:
            print(f"  ❌ Skipping {title} — transcription produced no output")
            return {"success": False, "segments": 0}
        
        # Show sample output
        print(f"\n  📋 Sample transcription (first 5 segments):")
        for seg in segments[:5]:
            print(f"     [{seg.get('start_seconds', 0):.1f}s → {seg.get('end_seconds', 0):.1f}s] {seg.get('text', '')}")
        
        if dry_run:
            print(f"\n  🔍 Dry run complete — {len(segments)} segments, not saving to DB")
            return {"success": True, "segments": len(segments), "dry_run": True}
        
        # Step 3: Save to Supabase
        result = upsert_to_supabase(supabase, movie_info, url, segments)
        return result


def run_seed_batch(dry_run: bool = False):
    """Run the approved 5-URL seed batch"""
    print("🌱 Running Vasanam seed batch (5 YouTube scene clips)")
    print(f"   Mode: {'DRY RUN — no DB writes' if dry_run else 'LIVE — writing to Supabase'}")
    print("=" * 60)
    
    results = []
    total_segments = 0
    
    for i, item in enumerate(SEED_BATCH):
        print(f"\n[{i+1}/{len(SEED_BATCH)}] {item['title']}")
        print(f"   {item['description']}")
        
        result = process_single(
            url=item["url"],
            title=item["title"],
            year=item["year"],
            title_tamil=item.get("title_tamil"),
            actors=item.get("actors"),
            director=item.get("director"),
            dry_run=dry_run,
        )
        results.append({"title": item["title"], **result})
        
        if result.get("success"):
            total_segments += result.get("segments", 0)
        
        # Rate limit between items
        if i < len(SEED_BATCH) - 1:
            print("  ⏳ Waiting 5s between clips...")
            time.sleep(5)
    
    print("\n" + "=" * 60)
    print("✅ Seed batch complete!")
    print(f"   Processed: {sum(1 for r in results if r.get('success'))}/{len(SEED_BATCH)} videos")
    print(f"   Total segments: {total_segments:,}")
    print()
    for r in results:
        status = "✅" if r.get("success") else "❌"
        segs = r.get("segments", 0)
        print(f"   {status} {r['title']}: {segs} segments")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Vasanam — Gemini Audio API Tanglish transcription pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run seed batch (5 approved clips):
  python3 scripts/ingest-gemini.py --batch

  # Process single URL:
  python3 scripts/ingest-gemini.py --url "https://youtube.com/watch?v=xFMJWJVLJxQ" --title "VIP" --year 2014

  # Dry run (transcribe only, no Supabase):
  python3 scripts/ingest-gemini.py --batch --dry-run
        """
    )
    
    parser.add_argument("--batch", action="store_true",
                        help="Run the approved 5-URL seed batch")
    parser.add_argument("--url", type=str,
                        help="YouTube URL to process")
    parser.add_argument("--title", type=str,
                        help="Movie title (required with --url)")
    parser.add_argument("--year", type=int,
                        help="Movie year (required with --url)")
    parser.add_argument("--title-tamil", type=str, default=None,
                        help="Tamil script title (optional)")
    parser.add_argument("--actors", type=str, default=None,
                        help="Comma-separated actor names (optional)")
    parser.add_argument("--director", type=str, default=None,
                        help="Director name (optional)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Transcribe and show output, but don't write to Supabase")
    
    args = parser.parse_args()
    
    if args.batch:
        run_seed_batch(dry_run=args.dry_run)
    elif args.url:
        if not args.title or not args.year:
            parser.error("--url requires --title and --year")
        
        actors = [a.strip() for a in args.actors.split(",")] if args.actors else []
        
        result = process_single(
            url=args.url,
            title=args.title,
            year=args.year,
            title_tamil=args.title_tamil,
            actors=actors,
            director=args.director,
            dry_run=args.dry_run,
        )
        
        if result.get("success"):
            print(f"\n✅ Done! {result.get('segments', 0)} segments indexed")
        else:
            print(f"\n❌ Failed")
            sys.exit(1)
    else:
        parser.print_help()
        print("\nNeed --batch or --url")
        sys.exit(1)


if __name__ == "__main__":
    main()
