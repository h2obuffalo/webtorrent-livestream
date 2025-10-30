const fs = require('fs');
const path = require('path');

// Read the existing lineup data
const lineupPath = path.join(__dirname, '../flutter_viewer/assets/lineup-2025.json');
const lineupData = JSON.parse(fs.readFileSync(lineupPath, 'utf8'));

// Festival dates: Friday Oct 27, Saturday Oct 28, Sunday Oct 29, 2025
const festivalDates = [
  '2025-10-27', // Friday
  '2025-10-28', // Saturday  
  '2025-10-29'  // Sunday
];

// Stage configurations with different time slots
const stageConfigs = {
  'Main Stage': {
    startHour: 20, // 8 PM
    endHour: 6,    // 6 AM next day
    setDuration: 60, // 60 minutes
    artists: []
  },
  'BANG FACE TV Live': {
    startHour: 19, // 7 PM
    endHour: 5,    // 5 AM next day
    setDuration: 45, // 45 minutes
    artists: []
  },
  'Hard Crew Heroes': {
    startHour: 18, // 6 PM
    endHour: 4,    // 4 AM next day
    setDuration: 30, // 30 minutes
    artists: []
  },
  'MAD': {
    startHour: 17, // 5 PM
    endHour: 3,    // 3 AM next day
    setDuration: 30, // 30 minutes
    artists: []
  },
  'Jungyals\'n\'Gays': {
    startHour: 16, // 4 PM
    endHour: 2,    // 2 AM next day
    setDuration: 30, // 30 minutes
    artists: []
  }
};

// Distribute artists across stages
lineupData.forEach(artist => {
  const primaryStage = artist.stages[0];
  if (stageConfigs[primaryStage]) {
    stageConfigs[primaryStage].artists.push(artist);
  }
});

// Generate realistic set times for each day
festivalDates.forEach(date => {
  Object.keys(stageConfigs).forEach(stageName => {
    const config = stageConfigs[stageName];
    const artists = config.artists;
    
    // Shuffle artists for variety
    const shuffledArtists = [...artists].sort(() => Math.random() - 0.5);
    
    let currentTime = new Date(`${date}T${config.startHour.toString().padStart(2, '0')}:00:00Z`);
    const endTime = new Date(`${date}T${config.endHour.toString().padStart(2, '0')}:00:00Z`);
    
    // Add next day if end time is before start time
    if (config.endHour < config.startHour) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    shuffledArtists.forEach(artist => {
      // Find the artist in the lineup data
      const lineupArtist = lineupData.find(a => a.id === artist.id);
      if (!lineupArtist) return;
      
      // Generate set time
      const setStart = new Date(currentTime);
      const setEnd = new Date(setStart.getTime() + config.setDuration * 60000);
      
      // Check if we have time for this set
      if (setEnd <= endTime) {
        lineupArtist.setTimes = [{
          start: setStart.toISOString(),
          end: setEnd.toISOString(),
          stage: stageName,
          status: 'scheduled'
        }];
        
        // Move to next time slot
        currentTime = new Date(setEnd.getTime() + 15 * 60000); // 15 min break
      }
    });
  });
});

// Add some artists with multiple sets across different days
const multiSetArtists = [
  { name: 'Max Cooper', stages: ['Main Stage', 'BANG FACE TV Live'] },
  { name: 'Pendulum DJ Set', stages: ['Main Stage'] },
  { name: 'The Glitch Mob', stages: ['Main Stage', 'Hard Crew Heroes'] }
];

multiSetArtists.forEach(multiArtist => {
  const artist = lineupData.find(a => a.name === multiArtist.name);
  if (artist) {
    artist.stages = multiArtist.stages;
    
    // Add additional sets
    const additionalSets = [];
    multiArtist.stages.forEach((stage, index) => {
      if (index > 0) { // Skip first stage (already has a set)
        const day = festivalDates[index % festivalDates.length];
        const config = stageConfigs[stage];
        const startHour = config.startHour + (index * 2); // Spread out
        const startTime = new Date(`${day}T${startHour.toString().padStart(2, '0')}:00:00Z`);
        const endTime = new Date(startTime.getTime() + config.setDuration * 60000);
        
        additionalSets.push({
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          stage: stage,
          status: 'scheduled'
        });
      }
    });
    
    if (additionalSets.length > 0) {
      artist.setTimes.push(...additionalSets);
    }
  }
});

// Write updated data back to file
fs.writeFileSync(lineupPath, JSON.stringify(lineupData, null, 2));

console.log('✅ Generated 3-day festival schedule!');
console.log(`📅 Festival dates: ${festivalDates.join(', ')}`);
console.log(`🎵 Total artists: ${lineupData.length}`);
console.log(`🎪 Stages: ${Object.keys(stageConfigs).join(', ')}`);

// Show some sample data
console.log('\n📋 Sample schedule:');
lineupData.slice(0, 5).forEach(artist => {
  console.log(`\n${artist.name}:`);
  artist.setTimes.forEach(set => {
    const start = new Date(set.start);
    const day = start.toLocaleDateString('en-US', { weekday: 'short' });
    const time = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    console.log(`  ${day} ${time} - ${set.stage}`);
  });
});
