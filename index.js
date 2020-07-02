/* Import Modules */
const fs = require("fs");
const { createClient } = require("pexels");
const vidl = require("vimeo-downloader");

/* Initialize a Promise Progress Bar For Console Output*/
const PromiseBar = require("promise.bar");
PromiseBar.enable();

/* Set API Key */
const apiKey = "563492ad6f91700001000001b074d4db233b407481887d65adb5a21e";

/* Create Client */
const client = createClient(apiKey);

// Set Query Param
const query = "Business";

// Set videos per page - max is 80 per page, setting to 50 so we can gather 100 in 2 pages
const videosPerPage = 50;

/* Utility Function to search videos - the limit per page is 80 videos */
const searchVideos = async (page) => {
  return await client.videos.search({ query, per_page: videosPerPage, page });
};

/* Utility Function to gather 100 videos from the api and strip out the video links */
const getVideoLinks = async () => {
  // Limit of videos per page is 80 - so call the search videos to get page 1 of the api response and page 2
  const videoChunk1 = await searchVideos(1);
  const videoChunk2 = await searchVideos(2);

  // Videos come back from api in nested objects with an array of 'videos'
  // Pull out the video arrays and combine them
  const fullVideoData = [...videoChunk1.videos, ...videoChunk2.videos];

  console.log(`Stripping video links...`);

  // Drill down into each video object and pull out the video of SD quality
  return fullVideoData.map((video, i) => {
    return video.video_files.find((video) => video.quality === "sd").link;
  });
};

/* Utility function to download videos to the './videos' folder */
const downloadVideos = async () => {
  const links = await getVideoLinks();

  /* Create an array to hold all of our saveVideo promises */
  const videoSavePromises = [];

  console.log("Parsing video links - This may take a few minutes...");

  /* Iterate through all of the stripped out links */
  links.forEach((link, i) => {
    // Push to the videoSavePromises array
    videoSavePromises.push(
      //Create a new promise so we can save videos asynchronously
      new Promise((resolve, reject) => {
        // Get the vimeo video stream with the 'vidl' package - get a quality of 720p
        const stream = vidl(link);

        // Pipe the stream into the createWriteStream function and save out to the videos folder
        // Videos will be names 1 - n .mp4
        stream.pipe(fs.createWriteStream(`./videos/${i + 1}.mp4`));

        // As we receive chunks, notify the user
        stream.on("data", function (chunk) {
          process.stdout.write(
            `${i + 1}.mp4: Downloading video - ${chunk.length}\r`
          );
        });

        // On completion, notify the user
        stream.on("end", function () {
          console.log(
            `${i + 1}.mp4: Finished video download --------------------`
          );
          resolve();
        });

        // On error - reject the promise with the error
        stream.on("error", function (err) {
          reject(err);
        });
      })
    );
  });

  // Run the progress bar until saveVideo completion
  await PromiseBar.all(videoSavePromises, { label: "Saving Videos" });
};

/* DOWNLOAD THE VIDEOS */
downloadVideos()
  .then(() => {
    console.log("All Videos Saved!");
  })
  .catch((err) => {
    console.log(err);
  });
