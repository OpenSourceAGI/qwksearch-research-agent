/**
 * Gets a random artistic background about graph theory
 * and collective consciousness, 50+ AI-gen artworks found online
 * @returns {string} Imgur URL of random artistic background
 */
export function getBackgroundArtwork(): string {
  const backgrounds = [
    "hyZbH3n.mp4", // student researchers with mind map ai
    "iOeZcCk.mp4", // graph dots and lines video
    "dUZlxYE.mp4", // spining globe scifi
    "GpWeP6E.gif", // flying spaceship into vortex
    "LuKUsLE.png", // AI mind in library
    "w7X11Dd.png", // knowledge graph in space
    "MHmVtCr.png", // vector search in space
    "HmnUAee.png", // science lab knowledge graph
    "vKP22VU.png", // quantum particles and spheres
    "l1lsV39.png", // agent heads with vectors
    "Ku8F2qc.png", // woman's head with vectors
    "KUEXtwm.png", // robot making a graph on table
    "vvKFPmY.png", // hacker with graph on screen
    "5p8eaEf.png", // arrows and circles emerging
    "VAKuJcG.png", // microcity blue with orange
    "sTMPtQW.png", // nebula waves with graph
    "m0gHbZZ.png", // moon phases ass circle ring
    "cKu7dWQ.png", // colorful tunnel into circle
    "ogfefYD.png", // golden gate bridge wires
    "ey5vAae.png", // abstract rectangle on bw
    "twuLrvk.png", // work office flow graph
    "ELILiYt.png", // blue cpu nodes and city
    "9el5qpP.png", // abstract lines on white
    "Up6xTkk.png", // blue head in graph cloud
    "W1XKBo0.png", // people sitting on desks
    "1Y6xvW0.png", // clock and basic shapes
    "JXOytMz.png", // eagle with stem wires
    "DNiI6pp.png", // abstract art mosaic
    "XDv5s6p.jpeg", // glowing orange with lights
    "eRwiRJ9.jpeg", // girl robot reading news
    "DRAfJoc.jpeg", // octopus brain emerges from datacenter
    "ASVRQ1G.jpeg", // wavy log black and circular lines
    "35svwUT.jpeg", // grey brain with ghost nodes
    "81xLiVI.jpeg", // 8 shapes around a cpu board
    "6kod2Em.jpeg", // radial blue to graph of docs
    "eU0C8zt.jpeg", // data insights big screen
    "Bv0PBY8.jpeg", // determinism to autonomy
    "DQNbjIZ.jpeg", // hald grid half circe wires
    "2uACPqZ.jpeg", // red vs blue graphs
    "XEKltMF.jpeg", // red blue spread out
    "WHgLfBm.jpeg", // red blue fusion waves
    "QFYM0Fw.jpeg", // red blue fusion heart
    "K12HCao.jpeg", // glass marble with light streaks
    "oN8rtsE.jpeg", // black tree with sub branches
    "9fGnrns.jpeg", // eye ball with wires around
    "2ONJJeW.jpeg", // blue girl with orange waves
    "DO23Va7.jpeg", // student seeing color wave
    "QaKeoXk.jpeg", // monster with legs in graph
    "QU5oCBR.jpeg", // orange ring shooting blue
    "MhlYZmh.jpeg", // pencil making graph on paper
    "ylL1ToB.jpeg", // blonde girl in graph wires
    "AWWsCv8.jpeg", // blue head in graph center
    "Tk9Tzzj.jpeg", // multi-verse spiral of universes
  ];
  return (
    "https://i.imgur.com/" +
    backgrounds[Math.floor(Math.random() * backgrounds.length)]
  );
}

/**
 * Get a greeting based on the time of day
 * @returns {string} A random greeting
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();

  const greetings = {
    morning: [
      "Good morning",
      "Rise and shine",
      "Top of the morning to you",
      "Have a great day ahead",
      "Wishing you a wonderful morning",
    ],
    afternoon: [
      "Good afternoon",
      "Hope your day is going well",
      "Enjoy your afternoon",
      "Greetings for a pleasant afternoon",
      "Wishing you a productive afternoon",
    ],
    evening: [
      "Good evening",
      "Hope you had a great day",
      "Wishing you a relaxing evening",
      "Pleasant evening to you",
      "Enjoy your evening",
    ],
    night: [
      "Greetings at this late hour",
      "Fancy seeing you up so late",
      "Burning the midnight oil, I see",
      "Hope your late-night work is going well",
      "Wishing you a productive night shift",
    ],
  };

  let timeOfDay;
  if (hour >= 5 && hour < 12) {
    timeOfDay = "morning";
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = "afternoon";
  } else if (hour >= 17 && hour < 22) {
    timeOfDay = "evening";
  } else {
    timeOfDay = "night";
  }

  const randomIndex = Math.floor(Math.random() * greetings[timeOfDay].length);
  return greetings[timeOfDay][randomIndex];
};
