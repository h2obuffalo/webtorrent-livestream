const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BANGFACE_URL = 'https://bangface.com/weekender2025/lineup/';
const OUTPUT_DIR = path.join(__dirname, '..', 'flutter_viewer', 'assets');
const PHOTOS_DIR = path.join(OUTPUT_DIR, 'lineup-photos');
const JSON_FILE = path.join(OUTPUT_DIR, 'lineup-2025.json');

// Create directories if they don't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

// Helper function to download image
async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(PHOTOS_DIR, filename));
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(path.join(PHOTOS_DIR, filename), () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Helper function to clean artist name from filename
function cleanArtistName(filename) {
  // Remove BangFace2025_ prefix and .jpg extension
  let name = filename.replace('BangFace2025_', '').replace('.jpg', '');
  
  // Handle special cases and clean up names
  const nameMappings = {
    'PendulumDJ': 'Pendulum DJ Set',
    'TheGlitchMob': 'The Glitch Mob',
    'PastisBuenri': 'Pastis & Buenri',
    'TeddyKillerz': 'Teddy Killerz',
    'LilTexas': 'Lil Texas',
    'RayKeith': 'Ray Keith & Renegade Band',
    'RenegadeBand': 'Ray Keith & Renegade Band', // Skip duplicate
    '4amKru': '4am Kru',
    'Mandidextrous': 'Mandidextrous',
    'Altern8': 'Altern 8',
    'LukeVibert': 'Luke Vibert',
    'TimReaper': 'Tim Reaper',
    'Ceephax': 'CeephaxAcid Crew',
    'IVY': '[IVY]',
    'Badger': 'Badger',
    'AnnaMorgan': 'Anna Morgan',
    'JensenInterceptor': 'JensenInterceptor',
    'Thys': 'Thys',
    'SamuraiBreaks': 'SamuraiBreaks',
    'Hixxy': 'Hixxy',
    'SarahBonito': 'DJ Sarah Bonito',
    'Aquarian': 'Aquarian',
    'Randomer': 'Randomer',
    'Ophidian': 'Ophidian',
    'Hellfish': 'Hellfish',
    'Farrah': 'Farrah',
    'AlexWilcox': 'Alex Wilcox',
    'PeteCannon': 'Pete Cannon',
    'Mixtress': 'Mixtress',
    'Phace': 'Phace',
    'TheCaracalProject': 'The CaracalProject',
    'TheOutsideAgency': 'The OutsideAgency',
    'TheDJProducer': 'The DJ Producer',
    'Limewax': 'Limewax',
    'DJFuckoff': 'DJ Fuckoff',
    'BigLad': 'Big Lad',
    'DopeAmmo': 'Dope Ammo',
    'LobstaB': 'Lobsta B',
    'HangTheDJs': 'Hang The DJs',
    'DJScotchEgg': 'DJ Scotch Egg',
    'Stazma': 'Stazma',
    'Rotator': 'Rotator',
    'SomniacOne': 'Somniac One',
    'Baseck': 'Baseck',
    'WayneAdams': 'Wayne Adams',
    'Anais': 'Anais',
    'Napes': 'Napes',
    'SpongebobSquarewave': 'Spongebob Squarewave',
    'Cheetah': 'Cheetah',
    'DuranDuranDuran': 'Duran Duran Duran',
    'DJSkullVomit': 'DJ Skull Vomit',
    'TobyRoss': 'Toby Ross',
    'ScottishGabberPunk': 'Scottish Gabber Punk',
    'LucyStoner': 'Lucy Stoner',
    'SampleJunkie': 'Sample Junkie',
    'DaveSkywalker': 'Dave Skywalker',
    'SaintAcid': 'Saint Acid & BANG FACE HARD CREW',
    'Hooversound': 'Hooversound',
    'Mousai': 'Mousai',
    'CHLOW333': 'CHLOW333',
    'Rodney': 'Rodney',
    'BETTY': 'BETTY',
    'BOWEN': 'BOWEN',
    'Dirtywavez': 'Dirtywavez',
    'TootiB': 'Tooti B',
    'SlayphexTwins': 'Slayphex Twins',
    'ShirleyTemper': 'Shirley Temper',
    'HollyWarcup': 'Holly Warcup',
    'PewTwo': 'PewTwo!',
    'BootyShakinBestiez1': 'Booty Shakin Bestiez Princess Elf Bar',
    'BootyShakinBestiez2': 'Booty Shakin Bestiez Princess Elf Bar',
    'Nice-n-Spicy': 'Nice\'n\'Spicy',
    'Kuiasu': 'Kuiasu',
    'TakenByMarshall': 'TakenByMarshall',
    'DJSlimeyMonster': 'DJ Slimey Monster',
    'Misterrcha': 'Misterrcha',
    'CompulsiveLeia': 'Compulsive Leia',
    'Hurtdeer': 'Hurtdeer',
    'DJCantSayNo': 'DJ Can\'t Say No',
    'MollieRush': 'Mollie Rush',
    'BreakforceOne': 'Breakforce One',
    'Audiobubble': 'Audiobubble',
    'SYNTAX': 'SYNTAX',
    'JustRob': 'JustRob',
    'DJANT': 'A.N.T',
    'Ellament': 'Ellament',
    'LosBanditos': 'Los Banditos De Baguette',
    'PaulBradley': 'Paul Bradley',
    'Tractorhands': 'Tractorhands',
    'WrongTV': 'Wrong TV',
    'AcidMorris': 'Acid Morris',
    'BigAl': 'Big Al',
    'BrainRaysQuiet': 'Brain Rays & Quiet',
    'Dankle': 'Dankle',
    'Diazepamela': 'Diazepamela',
    'DJTrev': 'DJ Trev',
    'DOOMSCROLL': 'DOOMSCROLL',
    'Eraserhead': 'Eraserhead',
    'FuckBees': 'Fuck Bees',
    'GreggeryPeccary': 'Greggery Peccary',
    'InBedWithMyBrother': 'In Bed With My Brother',
    'KrestTheBest': 'Krest The Best',
    'PartyScience': 'Party Science',
    'PeggyViennetta': 'Peggy Viennetta',
    'Sensi': 'Sensi',
    'SpaceCassette': 'Space Cassette',
    'Spinee': 'Spinee',
    'Tina': 'Tina',
    'Turbo': 'Turbo',
    'WaveyG': 'Wavey G',
    'Yanny': 'Yanny',
    'BDSMGardener': 'BDSM Gardener'
  };

  return nameMappings[name] || name.replace(/([A-Z])/g, ' $1').trim();
}

// Helper function to determine stage from image path
function getStageFromPath(imagePath) {
  if (imagePath.includes('Jungyals-n-Gays')) return 'Jungyals\'n\'Gays';
  if (imagePath.includes('MAD')) return 'MAD';
  if (imagePath.includes('HardCrewHeroes')) return 'Hard Crew Heroes';
  if (imagePath.includes('BFTV')) return 'BANG FACE TV Live';
  return 'Main Stage';
}

// Helper function to create slug from name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function scrapeBangFaceLineup() {
  try {
    console.log('Fetching BangFace lineup page...');
    const response = await axios.get(BANGFACE_URL);
    const $ = cheerio.load(response.data);
    
    const artists = [];
    let artistId = 1;
    
    // Find all images with artist photos
    $('img[src*="acts/"]').each((index, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      
      if (src && src.includes('BangFace2025_')) {
        // Fix the image URL construction
        const imageUrl = src.startsWith('http') ? src : `https://bangface.com/weekender2025/lineup/${src}`;
        const filename = path.basename(src);
        const artistName = cleanArtistName(filename);
        const stage = getStageFromPath(src);
        const slug = createSlug(artistName);
        
        // Skip duplicates (like RenegadeBand which is the same as RayKeith)
        if (artistName === 'Ray Keith & Renegade Band' && filename.includes('RenegadeBand')) {
          return;
        }
        
        artists.push({
          id: artistId++,
          name: artistName,
          photo: `assets/lineup-photos/${slug}.jpg`,
          website: null,
          bandcamp: null,
          blurb: null,
          stages: [stage],
          setTimes: [
            {
              start: "2025-10-29T20:00:00Z",
              end: "2025-10-29T21:00:00Z",
              stage: stage,
              status: "scheduled"
            }
          ]
        });
        
        // Download the image
        downloadImage(imageUrl, `${slug}.jpg`).catch(err => {
          console.error(`Failed to download ${filename}:`, err.message);
        });
      }
    });
    
    console.log(`Found ${artists.length} artists`);
    
    // Write JSON file
    fs.writeFileSync(JSON_FILE, JSON.stringify(artists, null, 2));
    console.log(`JSON file written to: ${JSON_FILE}`);
    
    // Wait for all downloads to complete
    console.log('Waiting for image downloads to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Scraping completed successfully!');
    
  } catch (error) {
    console.error('Error scraping BangFace lineup:', error.message);
    process.exit(1);
  }
}

// Run the scraper
scrapeBangFaceLineup();
