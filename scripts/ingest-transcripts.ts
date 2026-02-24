/**
 * Vasanam Transcript Ingestion Script
 *
 * Fetches YouTube transcripts for Tamil movies and indexes them in Supabase.
 * Run: npx ts-node --project tsconfig.scripts.json scripts/ingest-transcripts.ts
 *
 * Env vars needed:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { YoutubeTranscript } from "youtube-transcript";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 100 Tamil movies seed list with YouTube video IDs
// Priority: movies with manually uploaded subtitles for better accuracy
const MOVIES = [
  // Tier 1: Rajinikanth classics
  { title: "Baasha", title_tamil: "பாஷா", year: 1995, youtube_video_id: "IfkZMODd0A0", actors: ["Rajinikanth", "Nagma", "Raghuvaran"], director: "Suresh Krissna" },
  { title: "Muthu", title_tamil: "முத்து", year: 1995, youtube_video_id: "mH5qWjJ5kUo", actors: ["Rajinikanth", "Meena", "Sarath Babu"], director: "K. S. Ravikumar" },
  { title: "Padayappa", title_tamil: "படையப்பா", year: 1999, youtube_video_id: "U3xbZlHZFZQ", actors: ["Rajinikanth", "Ramya Krishnan", "Soundarya"], director: "K. S. Ravikumar" },
  { title: "Sivaji", title_tamil: "சிவாஜி", year: 2007, youtube_video_id: "DhvFJHUgDm0", actors: ["Rajinikanth", "Shriya Saran", "Vivek"], director: "Shankar" },
  { title: "Enthiran", title_tamil: "எந்திரன்", year: 2010, youtube_video_id: "5pENQPh0pR0", actors: ["Rajinikanth", "Aishwarya Rai", "Danny Denzongpa"], director: "Shankar" },
  { title: "Kabali", title_tamil: "கபாலி", year: 2016, youtube_video_id: "xpk2TKfkH6s", actors: ["Rajinikanth", "Radhika Apte", "Dhansika"], director: "Pa. Ranjith" },
  { title: "Kaala", title_tamil: "காலா", year: 2018, youtube_video_id: "pj8NOlJGNh8", actors: ["Rajinikanth", "Huma Qureshi", "Nana Patekar"], director: "Pa. Ranjith" },
  { title: "Jailer", title_tamil: "ஜெயிலர்", year: 2023, youtube_video_id: "k7nwToQnkL8", actors: ["Rajinikanth", "Tamannaah", "Ramya Krishnan"], director: "Nelson Dilipkumar" },
  { title: "Annaatthe", title_tamil: "அண்ணாத்தே", year: 2021, youtube_video_id: "GR4v1qxY-jg", actors: ["Rajinikanth", "Nayanthara", "Keerthy Suresh"], director: "Siva" },
  { title: "Darbar", title_tamil: "டார்பார்", year: 2020, youtube_video_id: "R5fHPi8-pXA", actors: ["Rajinikanth", "Nayanthara", "Suniel Shetty"], director: "A. R. Murugadoss" },

  // Tier 1: Kamal Haasan
  { title: "Nayakan", title_tamil: "நாயகன்", year: 1987, youtube_video_id: "k2IXFaomcF8", actors: ["Kamal Haasan", "Saranya", "Janagaraj"], director: "Mani Ratnam" },
  { title: "Thevar Magan", title_tamil: "தேவர் மகன்", year: 1992, youtube_video_id: "QmNkCo7uB3Y", actors: ["Kamal Haasan", "Revathi", "Madhoo"], director: "Bharathan" },
  { title: "Anbe Sivam", title_tamil: "அன்பே சிவம்", year: 2003, youtube_video_id: "vCBpNDdKnzQ", actors: ["Kamal Haasan", "Madhavan", "Kiran Rathod"], director: "Sundar C" },
  { title: "Dasavathaaram", title_tamil: "தசாவதாரம்", year: 2008, youtube_video_id: "X3WRCJbMDEE", actors: ["Kamal Haasan", "Asin", "Mallika Sherawat"], director: "K. S. Ravikumar" },
  { title: "Vikram", title_tamil: "விக்ரம்", year: 2022, youtube_video_id: "OKBMV24TRiI", actors: ["Kamal Haasan", "Vijay Sethupathi", "Fahadh Faasil"], director: "Lokesh Kanagaraj" },

  // Tier 2: Modern blockbusters
  { title: "Master", title_tamil: "மாஸ்டர்", year: 2021, youtube_video_id: "a29OMl9WTDA", actors: ["Vijay", "Vijay Sethupathi", "Malavika Mohanan"], director: "Lokesh Kanagaraj" },
  { title: "Beast", title_tamil: "பீஸ்ட்", year: 2022, youtube_video_id: "n-2VmzYiMdc", actors: ["Vijay", "Pooja Hegde", "Selvaraghavan"], director: "Nelson Dilipkumar" },
  { title: "Leo", title_tamil: "லியோ", year: 2023, youtube_video_id: "NkLRNXUJHOU", actors: ["Vijay", "Trisha", "Sanjay Dutt"], director: "Lokesh Kanagaraj" },
  { title: "Mersal", title_tamil: "மெர்சல்", year: 2017, youtube_video_id: "a5F5CVbCHl4", actors: ["Vijay", "Kajal Aggarwal", "Samantha"], director: "Atlee" },
  { title: "Bigil", title_tamil: "பிகில்", year: 2019, youtube_video_id: "HVbmF-VnhSc", actors: ["Vijay", "Nayanthara", "Jackie Shroff"], director: "Atlee" },
  { title: "Theri", title_tamil: "தேரி", year: 2016, youtube_video_id: "k9CluZFQrPM", actors: ["Vijay", "Samantha", "Amy Jackson"], director: "Atlee" },
  { title: "Varisu", title_tamil: "வாரிசு", year: 2023, youtube_video_id: "G8tCBWxuTQk", actors: ["Vijay", "Rashmika Mandanna", "Sarathkumar"], director: "Vamshi Paidipally" },

  // Ajith Kumar
  { title: "Mankatha", title_tamil: "மங்காத்தா", year: 2011, youtube_video_id: "eJnNK3pAEBs", actors: ["Ajith Kumar", "Trisha", "Manoj Manchu"], director: "Venkat Prabhu" },
  { title: "Vedalam", title_tamil: "வேதாளம்", year: 2015, youtube_video_id: "dZ3-8VIJfxs", actors: ["Ajith Kumar", "Shruti Haasan", "Lakshmi Menon"], director: "Siruthai Siva" },
  { title: "Vivegam", title_tamil: "விவேகம்", year: 2017, youtube_video_id: "7XAJkniclLs", actors: ["Ajith Kumar", "Vivek Oberoi", "Kajal Aggarwal"], director: "Siruthai Siva" },
  { title: "Valimai", title_tamil: "வலிமை", year: 2022, youtube_video_id: "0VE3v2W0oNs", actors: ["Ajith Kumar", "Huma Qureshi", "Karthikeya Gummakonda"], director: "H. Vinoth" },

  // Vikram
  { title: "Anniyan", title_tamil: "அன்னியன்", year: 2005, youtube_video_id: "3zFxFSP1SB4", actors: ["Vikram", "Sadha", "Vivek"], director: "Shankar" },
  { title: "I", title_tamil: "ஐ", year: 2015, youtube_video_id: "KW6J3r7F1rk", actors: ["Vikram", "Amy Jackson", "Suresh Gopi"], director: "Shankar" },
  { title: "Cobra", title_tamil: "கோப்ரா", year: 2022, youtube_video_id: "3H6d9EGIMDE", actors: ["Vikram", "Srinidhi Shetty", "Roshan Mathew"], director: "Ajay Gnanamuthu" },

  // Tier 3: Cult classics
  { title: "Alaipayuthey", title_tamil: "அலைபாயுதே", year: 2000, youtube_video_id: "j2QbxNKg_Z0", actors: ["Madhavan", "Shalini", "Vivek"], director: "Mani Ratnam" },
  { title: "Vinnaithaandi Varuvaayaa", title_tamil: "விண்ணைத்தாண்டி வருவாயா", year: 2010, youtube_video_id: "GsaXJ-yqNqo", actors: ["Silambarasan", "Trisha Krishnan"], director: "Gautham Menon" },
  { title: "96", title_tamil: "96", year: 2018, youtube_video_id: "Qk9JbXJvH2E", actors: ["Vijay Sethupathi", "Trisha", "Jyothika"], director: "C. Prem Kumar" },
  { title: "Kaithi", title_tamil: "கைதி", year: 2019, youtube_video_id: "3nYbThZQFqg", actors: ["Karthi", "Narain", "Arjun Das"], director: "Lokesh Kanagaraj" },
  { title: "Pariyerum Perumal", title_tamil: "பரியேறும் பெருமாள்", year: 2018, youtube_video_id: "j-yBGFMX5vY", actors: ["Kathir", "Anandhi", "Yogi Babu"], director: "Mari Selvaraj" },
  { title: "Soorarai Pottru", title_tamil: "சூரராய் பொட்று", year: 2020, youtube_video_id: "t_FxLr1WH3k", actors: ["Suriya", "Aparna Balamurali", "Paresh Rawal"], director: "Sudha Kongara" },
  { title: "Jai Bhim", title_tamil: "ஜெய் பீம்", year: 2021, youtube_video_id: "UHYgpj4JKTE", actors: ["Suriya", "Lijomol Jose", "Manikandan"], director: "T. J. Gnanavel" },
  { title: "Karnan", title_tamil: "கர்ணன்", year: 2021, youtube_video_id: "Lrz3LQs37VQ", actors: ["Dhanush", "Rajisha Vijayan", "Lal"], director: "Mari Selvaraj" },
  { title: "Asuran", title_tamil: "அசுரன்", year: 2019, youtube_video_id: "qxiVw8KaENE", actors: ["Dhanush", "Manju Warrier", "Pasupathy"], director: "Vetrimaaran" },

  // Tier 4: Vadivelu comedy goldmines
  { title: "Kaadhal Mannan", title_tamil: "காதல் மன்னன்", year: 1998, youtube_video_id: "vUFpkh8wLYk", actors: ["Ajith Kumar", "Vadivelu", "Shalini"], director: "Boyapati Srinu" },
  { title: "Mannan", title_tamil: "மன்னன்", year: 1992, youtube_video_id: "O5d5kMMSVds", actors: ["Rajinikanth", "Vadivelu", "Kushboo"], director: "K. S. Ravikumar" },
  { title: "Kadhala Kadhala", title_tamil: "காதலா காதலா", year: 1998, youtube_video_id: "Tk4OqMxJ1bM", actors: ["Kamal Haasan", "Vadivelu", "Prabhu Deva"], director: "Singeetam Srinivasa Rao" },
  { title: "Inaindha Kaigal", title_tamil: "இணைந்த கைகள்", year: 1990, youtube_video_id: "bZqXsGJZKNE", actors: ["Vijay", "Vadivelu", "Sanghavi"], director: "S. A. Chandrasekhar" },
  { title: "Thalai Nagam", title_tamil: "தலை நாகம்", year: 1990, youtube_video_id: "kQnE2azmhSg", actors: ["Vadivelu", "Pandiarajan"], director: "R. Thyagarajan" },

  // More modern hits
  { title: "Ponniyin Selvan Part 1", title_tamil: "பொன்னியின் செல்வன்", year: 2022, youtube_video_id: "UWBqiCbqzMQ", actors: ["Vikram", "Aishwarya Rai", "Trisha", "Karthi", "Jayam Ravi"], director: "Mani Ratnam" },
  { title: "Ponniyin Selvan Part 2", title_tamil: "பொன்னியின் செல்வன் 2", year: 2023, youtube_video_id: "p1jDrW3GDrw", actors: ["Vikram", "Aishwarya Rai", "Trisha", "Karthi"], director: "Mani Ratnam" },
  { title: "Jailer 2", title_tamil: "ஜெயிலர் 2", year: 2024, youtube_video_id: "placeholder_jailer2", actors: ["Rajinikanth"], director: "Nelson Dilipkumar" },
  { title: "Vettaiyan", title_tamil: "வேட்டையன்", year: 2024, youtube_video_id: "wPb_9N4WDPU", actors: ["Rajinikanth", "Amitabh Bachchan", "Fahadh Faasil"], director: "T. J. Gnanavel" },
  { title: "Lucky Baskhar", title_tamil: "லக்கி பாஸ்கர்", year: 2024, youtube_video_id: "mf4R7aT_cD0", actors: ["Dulquer Salmaan", "Meenakshi Chaudhary"], director: "Venky Atluri" },

  // Suriya films
  { title: "Ghajini", title_tamil: "காஜினி", year: 2005, youtube_video_id: "aPE5-M2gMpE", actors: ["Suriya", "Asin", "Nayanthara"], director: "A. R. Murugadoss" },
  { title: "Singam", title_tamil: "சிங்கம்", year: 2010, youtube_video_id: "V4mN5BdWV8Q", actors: ["Suriya", "Anushka Shetty", "Vivek"], director: "Hari" },
  { title: "7aum Arivu", title_tamil: "7ஆம் அறிவு", year: 2011, youtube_video_id: "dn8_T_BNJUY", actors: ["Suriya", "Shruti Haasan", "Johnny Tri Nguyen"], director: "A. R. Murugadoss" },
  { title: "Anjaan", title_tamil: "அஞ்சான்", year: 2014, youtube_video_id: "8V7jWkDSiPU", actors: ["Suriya", "Samantha", "Vidyut Jammwal"], director: "N. Linguswamy" },

  // Dhanush films
  { title: "3", title_tamil: "மூன்று", year: 2012, youtube_video_id: "YgFpQJ1xykg", actors: ["Dhanush", "Shruti Haasan", "Prabhu"], director: "Aishwarya Dhanush" },
  { title: "Velaiilla Pattadhari", title_tamil: "வேலை இல்ல பட்டதாரி", year: 2014, youtube_video_id: "sXFEkD4j4Yg", actors: ["Dhanush", "Amala Paul", "Vivek"], director: "Velraj" },
  { title: "Maari", title_tamil: "மாரி", year: 2015, youtube_video_id: "2XdYYFIGvug", actors: ["Dhanush", "Kajal Aggarwal", "Robo Shankar"], director: "Balaji Mohan" },
  { title: "Raanjhanaa Tamil", title_tamil: "ரான்ஜனா", year: 2013, youtube_video_id: "g6oaYJY5B-E", actors: ["Dhanush", "Sonam Kapoor", "Abhay Deol"], director: "Aanand L. Rai" },

  // Sivakarthikeyan
  { title: "Maaveeran", title_tamil: "மாவீரன்", year: 2023, youtube_video_id: "dScM-RA1P5E", actors: ["Sivakarthikeyan", "Aditi Shankar"], director: "Madonne Ashwin" },
  { title: "Doctor", title_tamil: "டாக்டர்", year: 2021, youtube_video_id: "b5kDCGHXVj8", actors: ["Sivakarthikeyan", "Priyanka Arul Mohan", "Vinay Rao"], director: "Nelson Dilipkumar" },
  { title: "Remo", title_tamil: "ரேமோ", year: 2016, youtube_video_id: "F0GidJzk9MA", actors: ["Sivakarthikeyan", "Keerthy Suresh"], director: "Bakkiyaraj Kannan" },
  { title: "Velaikkaaran", title_tamil: "வேலைக்காரன்", year: 2017, youtube_video_id: "fgFmz_ZR7J4", actors: ["Sivakarthikeyan", "Nayanthara", "Fahadh Faasil"], director: "Mohan Raja" },

  // KGF & Pan-India Tamil dubs (huge search volume)
  { title: "KGF Chapter 1 Tamil", title_tamil: "KGF தமிழ்", year: 2018, youtube_video_id: "xKmFovQz_PE", actors: ["Yash", "Srinidhi Shetty"], director: "Prashanth Neel" },
  { title: "KGF Chapter 2 Tamil", title_tamil: "KGF 2 தமிழ்", year: 2022, youtube_video_id: "yIJRK-PfQas", actors: ["Yash", "Sanjay Dutt", "Raveena Tandon"], director: "Prashanth Neel" },
  { title: "RRR Tamil", title_tamil: "RRR தமிழ்", year: 2022, youtube_video_id: "f_vbAtFSEc0", actors: ["N. T. Rama Rao Jr.", "Ram Charan", "Alia Bhatt", "Ajay Devgn"], director: "S. S. Rajamouli" },
  { title: "Pushpa Tamil", title_tamil: "புஷ்பா தமிழ்", year: 2021, youtube_video_id: "Q1NKMPhP8PY", actors: ["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil"], director: "Sukumar" },

  // More cult classics
  { title: "Pithamagan", title_tamil: "பித்தமகன்", year: 2003, youtube_video_id: "kL_xVT_bDZo", actors: ["Vikram", "Dhanush", "Suriya"], director: "Bala" },
  { title: "Sethu", title_tamil: "செது", year: 1999, youtube_video_id: "3VpkfHcEgaE", actors: ["Vikram", "Abitha"], director: "Bala" },
  { title: "Autograph", title_tamil: "ஆட்டோகிராஃப்", year: 2004, youtube_video_id: "xmk0aVkPVzE", actors: ["Cheran", "Sneha", "Gopika"], director: "Cheran" },
  { title: "Gentleman", title_tamil: "ஜென்டில்மேன்", year: 1993, youtube_video_id: "eX0lRrDnJXw", actors: ["Arjun Sarja", "Madhoo", "Charlie"], director: "Shankar" },
  { title: "Mudalvan", title_tamil: "முதல்வன்", year: 1999, youtube_video_id: "p1jPsOkJhsU", actors: ["Arjun Sarja", "Manisha Koirala", "Raghuvaran"], director: "S. Shankar" },
  { title: "Kandukondain Kandukondain", title_tamil: "கண்டுகொண்டேன் கண்டுகொண்டேன்", year: 2000, youtube_video_id: "0Fhbcqh63FI", actors: ["Ajith Kumar", "Mammootty", "Tabu", "Aishwarya Rai"], director: "Rajiv Menon" },

  // Tamil comedy
  { title: "Vasool Raja MBBS", title_tamil: "வசூல் ராஜா MBBS", year: 2004, youtube_video_id: "h7eE29tFhO4", actors: ["Kamal Haasan", "Prabhu Deva", "Sneha"], director: "Saran" },
  { title: "Shankar Dada Zindabad Tamil", title_tamil: "சங்கர் தாதா ஜிந்தாபாத்", year: 2007, youtube_video_id: "NmZEOWXm7_c", actors: ["Chiranjeevi", "Jyothika"], director: "Sreenu Vaitla" },

  // Vijay Sethupathi films
  { title: "Super Deluxe", title_tamil: "சூப்பர் டீலக்ஸ்", year: 2019, youtube_video_id: "4QlB5gLvH8w", actors: ["Vijay Sethupathi", "Fahadh Faasil", "Samantha", "Ramya Krishnan"], director: "Thiagarajan Kumararaja" },
  { title: "Makkal Selvan Vijay Sethupathi", title_tamil: "விஜய் சேதுபதி", year: 2020, youtube_video_id: "3jPe8k1vDhE", actors: ["Vijay Sethupathi"], director: "Various" },

  // Mani Ratnam classics
  { title: "Roja", title_tamil: "ரோஜா", year: 1992, youtube_video_id: "G0XTsFSE43I", actors: ["Arvind Swamy", "Madhoo", "Pankaj Kapur"], director: "Mani Ratnam" },
  { title: "Bombay", title_tamil: "பம்பாய்", year: 1995, youtube_video_id: "D8WH_eJn_5Y", actors: ["Arvind Swamy", "Manisha Koirala"], director: "Mani Ratnam" },
  { title: "Iruvar", title_tamil: "இருவர்", year: 1997, youtube_video_id: "Zl7eIJ9dT-k", actors: ["Mohanlal", "Aishwarya Rai", "Prakash Raj"], director: "Mani Ratnam" },
  { title: "Thalapathi", title_tamil: "தளபதி", year: 1991, youtube_video_id: "SHbPY1VlzKM", actors: ["Rajinikanth", "Mammootty", "Shobana"], director: "Mani Ratnam" },

  // More Rajini
  { title: "Thalapathy", title_tamil: "தளபதி", year: 1991, youtube_video_id: "SHbPY1VlzKM", actors: ["Rajinikanth", "Mammootty"], director: "Mani Ratnam" },
  { title: "Baba", title_tamil: "பாபா", year: 2002, youtube_video_id: "TfR8xB1jBmo", actors: ["Rajinikanth", "Manisha Koirala"], director: "Suresh Krissna" },
  { title: "Chandramukhi", title_tamil: "சந்திரமுகி", year: 2005, youtube_video_id: "h3RXKfRy_6c", actors: ["Rajinikanth", "Nayanthara", "Prabhu", "Jyothika"], director: "P. Vasu" },
  { title: "Petta", title_tamil: "பெட்ட", year: 2019, youtube_video_id: "lG5xb9X8YnQ", actors: ["Rajinikanth", "Trisha", "Vijay Sethupathi", "Bobby Simha"], director: "Karthik Subbaraj" },
  { title: "2.0 Tamil", title_tamil: "2.0", year: 2018, youtube_video_id: "KRcouP7DCMY", actors: ["Rajinikanth", "Akshay Kumar", "Amy Jackson"], director: "Shankar" },

  // Recent hits
  { title: "Thunivu", title_tamil: "துனிவு", year: 2023, youtube_video_id: "0_j1UDfLxPM", actors: ["Ajith Kumar", "Manju Warrier", "Samuthirakani"], director: "H. Vinoth" },
  { title: "Sarkar", title_tamil: "சர்க்கார்", year: 2018, youtube_video_id: "OdR5bSUq9bA", actors: ["Vijay", "Keerthy Suresh", "AR Murugadoss"], director: "A. R. Murugadoss" },
  { title: "Kaathu Vaakula Rendu Kaadhal", title_tamil: "காத்து வாக்குல ரெண்டு காதல்", year: 2022, youtube_video_id: "dLOifX_PNKM", actors: ["Vijay Sethupathi", "Trisha", "Samantha"], director: "Vignesh Shivn" },
];

interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

function detectLanguage(text: string): string {
  // Tamil Unicode range: 0x0B80 - 0x0BFF
  const tamilRegex = /[\u0B80-\u0BFF]/;
  if (tamilRegex.test(text)) return "tamil";

  // English detection
  const englishRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
  if (englishRatio > 0.7) return "english";

  // Default: Tanglish (Roman script Tamil)
  return "tanglish";
}

async function fetchTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    // Try Tamil transcript first
    let segments: TranscriptSegment[] = [];
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ta" }) as TranscriptSegment[];
    } catch {
      // Fallback to English subtitles
      try {
        segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }) as TranscriptSegment[];
      } catch {
        // Auto-generated captions (no lang preference)
        segments = await YoutubeTranscript.fetchTranscript(videoId) as TranscriptSegment[];
      }
    }
    return segments;
  } catch (err) {
    console.warn(`  No transcript for ${videoId}:`, (err as Error).message);
    return null;
  }
}

async function ingestMovie(movie: typeof MOVIES[0]): Promise<{ success: boolean; segments: number }> {
  console.log(`\n📽️  ${movie.title} (${movie.year}) — ${movie.youtube_video_id}`);

  // Skip placeholder IDs
  if (movie.youtube_video_id.startsWith("placeholder")) {
    console.log("  ⏭️  Skipping — placeholder video ID");
    return { success: false, segments: 0 };
  }

  // Upsert movie
  const { data: movieRecord, error: movieError } = await supabase
    .from("vasanam_movies")
    .upsert({
      title: movie.title,
      title_tamil: movie.title_tamil || null,
      year: movie.year,
      youtube_video_id: movie.youtube_video_id,
      actors: movie.actors || [],
      director: movie.director || null,
    }, { onConflict: "youtube_video_id" })
    .select("id")
    .single();

  if (movieError || !movieRecord) {
    console.error(`  ❌ Movie upsert failed:`, movieError?.message);
    return { success: false, segments: 0 };
  }

  // Fetch transcript
  const transcript = await fetchTranscript(movie.youtube_video_id);
  if (!transcript || transcript.length === 0) {
    console.log("  ⚠️  No transcript available");
    return { success: false, segments: 0 };
  }

  console.log(`  📝 ${transcript.length} raw segments`);

  // Filter and batch insert
  const validSegments = transcript
    .filter((seg) => seg.text && seg.text.trim().length > 3)
    .map((seg) => ({
      movie_id: movieRecord.id,
      text: seg.text.trim().replace(/\s+/g, " "),
      start_ms: Math.round(seg.offset),
      duration_ms: Math.round(seg.duration) || 3000,
      language: detectLanguage(seg.text),
    }));

  // Delete existing segments for this movie (re-ingest)
  await supabase.from("vasanam_segments").delete().eq("movie_id", movieRecord.id);

  // Batch insert (1000 at a time)
  const BATCH = 1000;
  for (let i = 0; i < validSegments.length; i += BATCH) {
    const batch = validSegments.slice(i, i + BATCH);
    const { error } = await supabase.from("vasanam_segments").insert(batch);
    if (error) {
      console.error(`  ❌ Segment insert error:`, error.message);
      return { success: false, segments: 0 };
    }
  }

  console.log(`  ✅ Indexed ${validSegments.length} segments`);
  return { success: true, segments: validSegments.length };
}

async function main() {
  console.log("🎬 Vasanam Transcript Ingestion");
  console.log(`   Movies to process: ${MOVIES.length}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log("");

  // Check for --movie flag to ingest a specific movie
  const movieArg = process.argv.find((a) => a.startsWith("--movie="));
  const moviesToProcess = movieArg
    ? MOVIES.filter((m) => m.title.toLowerCase().includes(movieArg.replace("--movie=", "").toLowerCase()))
    : MOVIES;

  let totalMovies = 0;
  let totalSegments = 0;
  let failed = 0;

  for (const movie of moviesToProcess) {
    const { success, segments } = await ingestMovie(movie);
    if (success) {
      totalMovies++;
      totalSegments += segments;
    } else {
      failed++;
    }
    // Rate limit: 1 request per 500ms to avoid YouTube throttling
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Done!`);
  console.log(`   Movies indexed: ${totalMovies}/${moviesToProcess.length}`);
  console.log(`   Total segments: ${totalSegments.toLocaleString()}`);
  console.log(`   Failed: ${failed}`);
}

main().catch(console.error);
