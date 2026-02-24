#!/usr/bin/env python3
"""
Vasanam — Subtitle Ingestion via OpenSubtitles API
Fetches Tamil/English subtitles for Tamil movies and indexes them in Supabase.

Usage:
  python3 scripts/ingest-opensubtitles.py --username USER --password PASS [--movie "Baasha"]

Requirements:
  pip install requests supabase python-dotenv

OpenSubtitles API: https://opensubtitles.stoplight.io/
Register at: https://www.opensubtitles.com/en/consumers
"""

import os, sys, re, time, json, gzip, io
import argparse
import requests
from supabase import create_client

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OS_BASE      = "https://api.opensubtitles.com/api/v1"
OS_APP_NAME  = "Vasanam v1.0"

# ── Movie list with IMDB IDs (for OpenSubtitles search) ───────────────────────
MOVIES = [
    # Rajinikanth
    {"title": "Baasha",         "title_tamil": "பாஷா",         "year": 1995, "imdb_id": "tt0115147", "youtube_video_id": "IfkZMODd0A0", "actors": ["Rajinikanth","Nagma","Raghuvaran"],        "director": "Suresh Krissna"},
    {"title": "Muthu",          "title_tamil": "முத்து",        "year": 1995, "imdb_id": "tt0128664", "youtube_video_id": "mH5qWjJ5kUo", "actors": ["Rajinikanth","Meena","Sarath Babu"],      "director": "K. S. Ravikumar"},
    {"title": "Padayappa",      "title_tamil": "படையப்பா",     "year": 1999, "imdb_id": "tt0209297", "youtube_video_id": "U3xbZlHZFZQ", "actors": ["Rajinikanth","Ramya Krishnan"],           "director": "K. S. Ravikumar"},
    {"title": "Chandramukhi",   "title_tamil": "சந்திரமுகி",   "year": 2005, "imdb_id": "tt0430394", "youtube_video_id": "h3RXKfRy_6c", "actors": ["Rajinikanth","Nayanthara","Jyothika"],    "director": "P. Vasu"},
    {"title": "Sivaji",         "title_tamil": "சிவாஜி",       "year": 2007, "imdb_id": "tt0993739", "youtube_video_id": "DhvFJHUgDm0", "actors": ["Rajinikanth","Shriya Saran"],             "director": "Shankar"},
    {"title": "Enthiran",       "title_tamil": "எந்திரன்",     "year": 2010, "imdb_id": "tt1311060", "youtube_video_id": "5pENQPh0pR0", "actors": ["Rajinikanth","Aishwarya Rai"],            "director": "Shankar"},
    {"title": "Kabali",         "title_tamil": "கபாலி",        "year": 2016, "imdb_id": "tt5752202", "youtube_video_id": "xpk2TKfkH6s", "actors": ["Rajinikanth","Radhika Apte"],             "director": "Pa. Ranjith"},
    {"title": "Petta",          "title_tamil": "பெட்ட",        "year": 2019, "imdb_id": "tt8888126", "youtube_video_id": "lG5xb9X8YnQ", "actors": ["Rajinikanth","Trisha","Vijay Sethupathi"], "director": "Karthik Subbaraj"},
    {"title": "Darbar",         "title_tamil": "டார்பார்",     "year": 2020, "imdb_id": "tt9742072", "youtube_video_id": "R5fHPi8-pXA", "actors": ["Rajinikanth","Nayanthara"],               "director": "A. R. Murugadoss"},
    {"title": "Jailer",         "title_tamil": "ஜெயிலர்",     "year": 2023, "imdb_id": "tt20877736","youtube_video_id": "k7nwToQnkL8", "actors": ["Rajinikanth","Tamannaah"],                "director": "Nelson Dilipkumar"},

    # Kamal Haasan
    {"title": "Nayakan",        "title_tamil": "நாயகன்",       "year": 1987, "imdb_id": "tt0093654", "youtube_video_id": "k2IXFaomcF8", "actors": ["Kamal Haasan","Saranya"],                 "director": "Mani Ratnam"},
    {"title": "Thevar Magan",   "title_tamil": "தேவர் மகன்",   "year": 1992, "imdb_id": "tt0105756", "youtube_video_id": "QmNkCo7uB3Y", "actors": ["Kamal Haasan","Revathi"],                 "director": "Bharathan"},
    {"title": "Anbe Sivam",     "title_tamil": "அன்பே சிவம்",  "year": 2003, "imdb_id": "tt0390508", "youtube_video_id": "vCBpNDdKnzQ", "actors": ["Kamal Haasan","Madhavan"],                "director": "Sundar C"},
    {"title": "Dasavathaaram",  "title_tamil": "தசாவதாரம்",    "year": 2008, "imdb_id": "tt1082217", "youtube_video_id": "X3WRCJbMDEE", "actors": ["Kamal Haasan","Asin"],                    "director": "K. S. Ravikumar"},
    {"title": "Vikram",         "title_tamil": "விக்ரம்",      "year": 2022, "imdb_id": "tt15097216","youtube_video_id": "OKBMV24TRiI", "actors": ["Kamal Haasan","Vijay Sethupathi","Fahadh Faasil"], "director": "Lokesh Kanagaraj"},

    # Vijay
    {"title": "Theri",          "title_tamil": "தேரி",         "year": 2016, "imdb_id": "tt5295052", "youtube_video_id": "k9CluZFQrPM", "actors": ["Vijay","Samantha"],                       "director": "Atlee"},
    {"title": "Mersal",         "title_tamil": "மெர்சல்",      "year": 2017, "imdb_id": "tt7186854", "youtube_video_id": "a5F5CVbCHl4", "actors": ["Vijay","Kajal Aggarwal","Samantha"],      "director": "Atlee"},
    {"title": "Bigil",          "title_tamil": "பிகில்",       "year": 2019, "imdb_id": "tt9697420", "youtube_video_id": "HVbmF-VnhSc", "actors": ["Vijay","Nayanthara"],                     "director": "Atlee"},
    {"title": "Master",         "title_tamil": "மாஸ்டர்",      "year": 2021, "imdb_id": "tt10399006","youtube_video_id": "a29OMl9WTDA", "actors": ["Vijay","Vijay Sethupathi"],                "director": "Lokesh Kanagaraj"},
    {"title": "Beast",          "title_tamil": "பீஸ்ட்",       "year": 2022, "imdb_id": "tt15671028","youtube_video_id": "n-2VmzYiMdc", "actors": ["Vijay","Pooja Hegde"],                    "director": "Nelson Dilipkumar"},
    {"title": "Leo",            "title_tamil": "லியோ",         "year": 2023, "imdb_id": "tt22234044","youtube_video_id": "NkLRNXUJHOU", "actors": ["Vijay","Trisha","Sanjay Dutt"],           "director": "Lokesh Kanagaraj"},
    {"title": "Varisu",         "title_tamil": "வாரிசு",       "year": 2023, "imdb_id": "tt19865374","youtube_video_id": "G8tCBWxuTQk", "actors": ["Vijay","Rashmika Mandanna"],              "director": "Vamshi Paidipally"},

    # Ajith
    {"title": "Mankatha",       "title_tamil": "மங்காத்தா",    "year": 2011, "imdb_id": "tt2044490", "youtube_video_id": "eJnNK3pAEBs", "actors": ["Ajith Kumar","Trisha"],                  "director": "Venkat Prabhu"},
    {"title": "Vedalam",        "title_tamil": "வேதாளம்",      "year": 2015, "imdb_id": "tt5124846", "youtube_video_id": "dZ3-8VIJfxs", "actors": ["Ajith Kumar","Shruti Haasan"],           "director": "Siruthai Siva"},
    {"title": "Vivegam",        "title_tamil": "விவேகம்",      "year": 2017, "imdb_id": "tt6886832", "youtube_video_id": "7XAJkniclLs", "actors": ["Ajith Kumar","Kajal Aggarwal"],           "director": "Siruthai Siva"},
    {"title": "Valimai",        "title_tamil": "வலிமை",        "year": 2022, "imdb_id": "tt11438232","youtube_video_id": "0VE3v2W0oNs", "actors": ["Ajith Kumar","Huma Qureshi"],             "director": "H. Vinoth"},
    {"title": "Thunivu",        "title_tamil": "துனிவு",       "year": 2023, "imdb_id": "tt14686842","youtube_video_id": "0_j1UDfLxPM", "actors": ["Ajith Kumar","Manju Warrier"],            "director": "H. Vinoth"},

    # Vikram
    {"title": "Anniyan",        "title_tamil": "அன்னியன்",     "year": 2005, "imdb_id": "tt0430389", "youtube_video_id": "3zFxFSP1SB4", "actors": ["Vikram","Sadha","Vivek"],                 "director": "Shankar"},
    {"title": "I",              "title_tamil": "ஐ",            "year": 2015, "imdb_id": "tt3230052", "youtube_video_id": "KW6J3r7F1rk", "actors": ["Vikram","Amy Jackson"],                  "director": "Shankar"},

    # Mani Ratnam
    {"title": "Roja",           "title_tamil": "ரோஜா",         "year": 1992, "imdb_id": "tt0105286", "youtube_video_id": "G0XTsFSE43I", "actors": ["Arvind Swamy","Madhoo"],                  "director": "Mani Ratnam"},
    {"title": "Bombay",         "title_tamil": "பம்பாய்",      "year": 1995, "imdb_id": "tt0112382", "youtube_video_id": "D8WH_eJn_5Y", "actors": ["Arvind Swamy","Manisha Koirala"],          "director": "Mani Ratnam"},
    {"title": "Thalapathi",     "title_tamil": "தளபதி",        "year": 1991, "imdb_id": "tt0103073", "youtube_video_id": "SHbPY1VlzKM", "actors": ["Rajinikanth","Mammootty"],                "director": "Mani Ratnam"},
    {"title": "Alaipayuthey",   "title_tamil": "அலைபாயுதே",    "year": 2000, "imdb_id": "tt0248194", "youtube_video_id": "j2QbxNKg_Z0", "actors": ["Madhavan","Shalini"],                     "director": "Mani Ratnam"},

    # Cult classics
    {"title": "Vinnaithaandi Varuvaayaa", "title_tamil": "விண்ணைத்தாண்டி வருவாயா", "year": 2010, "imdb_id": "tt1558950", "youtube_video_id": "GsaXJ-yqNqo", "actors": ["Silambarasan","Trisha"], "director": "Gautham Menon"},
    {"title": "96",             "title_tamil": "96",            "year": 2018, "imdb_id": "tt7888432", "youtube_video_id": "Qk9JbXJvH2E", "actors": ["Vijay Sethupathi","Trisha"],              "director": "C. Prem Kumar"},
    {"title": "Kaithi",         "title_tamil": "கைதி",         "year": 2019, "imdb_id": "tt9731534", "youtube_video_id": "3nYbThZQFqg", "actors": ["Karthi","Narain"],                        "director": "Lokesh Kanagaraj"},
    {"title": "Soorarai Pottru","title_tamil": "சூரராய் பொட்று","year": 2020,"imdb_id": "tt9577092", "youtube_video_id": "t_FxLr1WH3k", "actors": ["Suriya","Aparna Balamurali"],             "director": "Sudha Kongara"},
    {"title": "Jai Bhim",       "title_tamil": "ஜெய் பீம்",    "year": 2021, "imdb_id": "tt15097130","youtube_video_id": "UHYgpj4JKTE", "actors": ["Suriya","Lijomol Jose"],                  "director": "T. J. Gnanavel"},
    {"title": "Super Deluxe",   "title_tamil": "சூப்பர் டீலக்ஸ்","year": 2019,"imdb_id": "tt8482114","youtube_video_id": "4QlB5gLvH8w", "actors": ["Vijay Sethupathi","Fahadh Faasil","Samantha"], "director": "Thiagarajan Kumararaja"},
    {"title": "Pariyerum Perumal","title_tamil": "பரியேறும் பெருமாள்","year": 2018,"imdb_id": "tt8615048","youtube_video_id": "j-yBGFMX5vY","actors": ["Kathir","Anandhi"],"director": "Mari Selvaraj"},
    {"title": "Karnan",         "title_tamil": "கர்ணன்",       "year": 2021, "imdb_id": "tt13637504","youtube_video_id": "Lrz3LQs37VQ", "actors": ["Dhanush","Rajisha Vijayan"],              "director": "Mari Selvaraj"},
    {"title": "Asuran",         "title_tamil": "அசுரன்",       "year": 2019, "imdb_id": "tt9795400", "youtube_video_id": "qxiVw8KaENE", "actors": ["Dhanush","Manju Warrier"],                "director": "Vetrimaaran"},

    # Suriya
    {"title": "Ghajini",        "title_tamil": "காஜினி",       "year": 2005, "imdb_id": "tt0472258", "youtube_video_id": "aPE5-M2gMpE", "actors": ["Suriya","Asin","Nayanthara"],             "director": "A. R. Murugadoss"},
    {"title": "Singam",         "title_tamil": "சிங்கம்",      "year": 2010, "imdb_id": "tt1702553", "youtube_video_id": "V4mN5BdWV8Q", "actors": ["Suriya","Anushka Shetty"],                "director": "Hari"},

    # Dhanush
    {"title": "Velaiilla Pattadhari","title_tamil": "வேலை இல்ல பட்டதாரி","year": 2014,"imdb_id": "tt3705836","youtube_video_id": "sXFEkD4j4Yg","actors": ["Dhanush","Amala Paul"],"director": "Velraj"},

    # Pan-India Tamil dubs
    {"title": "KGF Chapter 1 Tamil","title_tamil": "KGF தமிழ்","year": 2018,"imdb_id": "tt8367814","youtube_video_id": "xKmFovQz_PE","actors": ["Yash","Srinidhi Shetty"],"director": "Prashanth Neel"},
    {"title": "KGF Chapter 2 Tamil","title_tamil": "KGF 2 தமிழ்","year": 2022,"imdb_id": "tt10818154","youtube_video_id": "yIJRK-PfQas","actors": ["Yash","Sanjay Dutt"],"director": "Prashanth Neel"},
    {"title": "RRR Tamil",      "title_tamil": "RRR தமிழ்",    "year": 2022, "imdb_id": "tt8178634", "youtube_video_id": "f_vbAtFSEc0", "actors": ["N. T. Rama Rao Jr.","Ram Charan"],        "director": "S. S. Rajamouli"},
    {"title": "Pushpa Tamil",   "title_tamil": "புஷ்பா தமிழ்", "year": 2021, "imdb_id": "tt11274622","youtube_video_id": "Q1NKMPhP8PY", "actors": ["Allu Arjun","Rashmika Mandanna"],         "director": "Sukumar"},
    {"title": "Ponniyin Selvan Part 1","title_tamil": "பொன்னியின் செல்வன்","year": 2022,"imdb_id": "tt2638240","youtube_video_id": "UWBqiCbqzMQ","actors": ["Vikram","Aishwarya Rai","Trisha","Karthi"],"director": "Mani Ratnam"},
    {"title": "Vettaiyan",      "title_tamil": "வேட்டையன்",    "year": 2024, "imdb_id": "tt28444021","youtube_video_id": "wPb_9N4WDPU", "actors": ["Rajinikanth","Amitabh Bachchan","Fahadh Faasil"], "director": "T. J. Gnanavel"},

    # Vadivelu comedies
    {"title": "Mannan",         "title_tamil": "மன்னன்",       "year": 1992, "imdb_id": "tt0104968", "youtube_video_id": "O5d5kMMSVds", "actors": ["Rajinikanth","Vadivelu","Kushboo"],       "director": "K. S. Ravikumar"},
    {"title": "Kadhala Kadhala","title_tamil": "காதலா காதலா",  "year": 1998, "imdb_id": "tt0194140", "youtube_video_id": "Tk4OqMxJ1bM", "actors": ["Kamal Haasan","Vadivelu","Prabhu Deva"],  "director": "Singeetam Srinivasa Rao"},

    # Sivakarthikeyan
    {"title": "Doctor",         "title_tamil": "டாக்டர்",      "year": 2021, "imdb_id": "tt13611268","youtube_video_id": "b5kDCGHXVj8", "actors": ["Sivakarthikeyan","Priyanka Arul Mohan"],  "director": "Nelson Dilipkumar"},
    {"title": "Maaveeran",      "title_tamil": "மாவீரன்",      "year": 2023, "imdb_id": "tt21827178","youtube_video_id": "dScM-RA1P5E", "actors": ["Sivakarthikeyan","Aditi Shankar"],        "director": "Madonne Ashwin"},
]

# ── SRT parser ────────────────────────────────────────────────────────────────
def parse_srt(content: str) -> list[dict]:
    """Parse SRT subtitle content into list of {text, start_ms, duration_ms}"""
    segments = []
    blocks = re.split(r'\n\n+', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        
        # Find timecode line (e.g., "00:01:23,456 --> 00:01:25,789")
        timecode_line = None
        text_lines = []
        for i, line in enumerate(lines):
            if '-->' in line:
                timecode_line = line
                text_lines = lines[i+1:]
                break
        
        if not timecode_line or not text_lines:
            continue
        
        # Parse timestamps
        try:
            parts = timecode_line.split(' --> ')
            start_ms = srt_time_to_ms(parts[0].strip())
            end_ms = srt_time_to_ms(parts[1].strip().split(' ')[0])
            
            text = ' '.join(text_lines).strip()
            # Remove HTML tags
            text = re.sub(r'<[^>]+>', '', text)
            # Remove SDH markers like (Music), [Applause]
            text = re.sub(r'\([^)]*\)|\[[^\]]*\]', '', text).strip()
            
            if text and len(text) > 2:
                segments.append({
                    'text': text,
                    'start_ms': start_ms,
                    'duration_ms': max(end_ms - start_ms, 1000),
                })
        except Exception:
            continue
    
    return segments

def srt_time_to_ms(time_str: str) -> int:
    """Convert SRT time format (HH:MM:SS,mmm) to milliseconds"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    sec_ms = float(parts[2])
    return int((hours * 3600 + minutes * 60 + sec_ms) * 1000)

def detect_language(text: str) -> str:
    tamil_re = re.compile(r'[\u0B80-\u0BFF]')
    if tamil_re.search(text):
        return 'tamil'
    english_ratio = len(re.findall(r'[a-zA-Z]', text)) / max(len(text), 1)
    return 'english' if english_ratio > 0.7 else 'tanglish'

# ── OpenSubtitles client ──────────────────────────────────────────────────────
class OpenSubtitlesClient:
    def __init__(self, username: str, password: str, api_key: str):
        self.username = username
        self.password = password
        self.api_key = api_key
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Api-Key': api_key,
            'Content-Type': 'application/json',
            'User-Agent': OS_APP_NAME,
        })
    
    def login(self):
        resp = self.session.post(f"{OS_BASE}/login", json={
            "username": self.username,
            "password": self.password,
        })
        resp.raise_for_status()
        self.token = resp.json()['token']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        print(f"  ✅ Logged in to OpenSubtitles")
    
    def search(self, imdb_id: str, languages: list[str] = ["ta", "en"]) -> list[dict]:
        """Search for subtitles by IMDB ID"""
        results = []
        for lang in languages:
            try:
                resp = self.session.get(f"{OS_BASE}/subtitles", params={
                    "imdb_id": imdb_id.replace("tt", ""),
                    "languages": lang,
                    "type": "movie",
                })
                if resp.status_code == 200:
                    data = resp.json()
                    results.extend(data.get('data', []))
            except Exception as e:
                print(f"    Search error ({lang}): {e}")
        return results
    
    def download(self, file_id: int) -> str | None:
        """Download subtitle content"""
        try:
            resp = self.session.post(f"{OS_BASE}/download", json={
                "file_id": file_id,
                "sub_format": "srt",
            })
            resp.raise_for_status()
            data = resp.json()
            
            # Download the actual file
            file_url = data.get('link')
            if not file_url:
                return None
            
            file_resp = requests.get(file_url)
            content = file_resp.content
            
            # Handle gzip
            if content[:2] == b'\x1f\x8b':
                content = gzip.decompress(content)
            
            return content.decode('utf-8', errors='replace')
        except Exception as e:
            print(f"    Download error: {e}")
            return None

# ── Main ingestion ─────────────────────────────────────────────────────────────
def ingest_movie(supabase, os_client: OpenSubtitlesClient, movie: dict) -> dict:
    print(f"\n📽️  {movie['title']} ({movie['year']}) — IMDB: {movie['imdb_id']}")
    
    # Upsert movie record
    result = supabase.table("vasanam_movies").upsert({
        "title": movie["title"],
        "title_tamil": movie.get("title_tamil"),
        "year": movie["year"],
        "youtube_video_id": movie["youtube_video_id"],
        "actors": movie.get("actors", []),
        "director": movie.get("director"),
    }, on_conflict="youtube_video_id").execute()
    
    movie_id = result.data[0]["id"]
    
    # Search for subtitles
    subs = os_client.search(movie["imdb_id"], ["ta", "en"])
    if not subs:
        print("  ⚠️  No subtitles found on OpenSubtitles")
        return {"success": False, "segments": 0}
    
    print(f"  📝 Found {len(subs)} subtitle files")
    
    # Pick best subtitle (prefer Tamil, then English, highest download count)
    ta_subs = [s for s in subs if s.get("attributes", {}).get("language") == "ta"]
    en_subs = [s for s in subs if s.get("attributes", {}).get("language") == "en"]
    
    chosen = sorted(ta_subs or en_subs, 
                   key=lambda s: s.get("attributes", {}).get("download_count", 0), 
                   reverse=True)
    
    if not chosen:
        print("  ⚠️  No usable subtitle file")
        return {"success": False, "segments": 0}
    
    # Download
    file_id = chosen[0].get("attributes", {}).get("files", [{}])[0].get("file_id")
    if not file_id:
        print("  ⚠️  No file_id in subtitle")
        return {"success": False, "segments": 0}
    
    content = os_client.download(file_id)
    if not content:
        print("  ⚠️  Download failed")
        return {"success": False, "segments": 0}
    
    # Parse SRT
    segments = parse_srt(content)
    if not segments:
        print("  ⚠️  Could not parse SRT")
        return {"success": False, "segments": 0}
    
    print(f"  🔤 Parsed {len(segments)} dialogue segments")
    
    # Detect language
    lang = detect_language(segments[0]["text"] if segments else "")
    
    # Delete existing + batch insert
    supabase.table("vasanam_segments").delete().eq("movie_id", movie_id).execute()
    
    BATCH = 500
    total = 0
    for i in range(0, len(segments), BATCH):
        batch = [{
            "movie_id": movie_id,
            "text": s["text"],
            "start_ms": s["start_ms"],
            "duration_ms": s["duration_ms"],
            "language": detect_language(s["text"]),
        } for s in segments[i:i+BATCH]]
        supabase.table("vasanam_segments").insert(batch).execute()
        total += len(batch)
    
    print(f"  ✅ Indexed {total} segments ({lang})")
    return {"success": True, "segments": total}

def main():
    parser = argparse.ArgumentParser(description="Vasanam subtitle ingestion")
    parser.add_argument("--username", required=True, help="OpenSubtitles username")
    parser.add_argument("--password", required=True, help="OpenSubtitles password")
    parser.add_argument("--api-key", required=True, help="OpenSubtitles API key")
    parser.add_argument("--movie", help="Filter by movie title (partial match)")
    args = parser.parse_args()
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars")
        sys.exit(1)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    os_client = OpenSubtitlesClient(args.username, args.password, args.api_key)
    os_client.login()
    
    movies = MOVIES
    if args.movie:
        movies = [m for m in MOVIES if args.movie.lower() in m["title"].lower()]
        print(f"Filtered to: {[m['title'] for m in movies]}")
    
    print(f"\n🎬 Vasanam Subtitle Ingestion")
    print(f"   Movies: {len(movies)}")
    
    total_movies = 0
    total_segments = 0
    
    for movie in movies:
        result = ingest_movie(supabase, os_client, movie)
        if result["success"]:
            total_movies += 1
            total_segments += result["segments"]
        time.sleep(1)  # Rate limit
    
    print(f"\n{'='*50}")
    print(f"✅ Done! {total_movies}/{len(movies)} movies, {total_segments:,} segments total")

if __name__ == "__main__":
    main()
