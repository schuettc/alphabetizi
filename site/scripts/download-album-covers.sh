#!/bin/bash

# Create the albums directory if it doesn't exist
mkdir -p public/images/albums

# Define the album covers to download
echo "Downloading album covers..."

# Dark Side of the Moon
curl -s "https://upload.wikimedia.org/wikipedia/en/3/3b/Dark_Side_of_the_Moon.png" \
  -o public/images/albums/pink-floyd-dark-side-of-the-moon.jpg

# Taylor Swift - 1989
curl -s "https://upload.wikimedia.org/wikipedia/en/f/f6/Taylor_Swift_-_1989.png" \
  -o public/images/albums/taylor-swift-1989.jpg

# The Beatles - Abbey Road
curl -s "https://upload.wikimedia.org/wikipedia/en/4/42/Beatles_-_Abbey_Road.jpg" \
  -o public/images/albums/beatles-abbey-road.jpg

# Add more album covers here as needed

echo "Album covers downloaded to public/images/albums/"
echo "Note: You may want to optimize these images for web using tools like TinyPNG or Squoosh." 