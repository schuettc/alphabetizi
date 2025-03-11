# Album Cover Images

This directory contains album cover images for the survey questions. Follow these guidelines when adding new album covers:

## Image Guidelines

1. **Naming Convention**: Use lowercase with hyphens for filenames:

   - `artist-name-album-title.jpg`
   - Example: `pink-floyd-dark-side-of-the-moon.jpg`

2. **Image Format**: Use JPEG (.jpg) for photographs and album covers, or PNG (.png) for images with transparency.

3. **Image Size**:

   - Aim for square images (1:1 aspect ratio)
   - Recommended size: 300-500px square
   - Keep file sizes under 200KB when possible for faster loading

4. **Source Images**: You can find album covers from:
   - [Wikipedia](https://www.wikipedia.org/)
   - [Discogs](https://www.discogs.com/)
   - [Amazon](https://www.amazon.com/)
   - [Apple Music](https://www.apple.com/apple-music/)

## Adding a New Album Cover

1. Download the image
2. Optimize it for web using a tool like [TinyPNG](https://tinypng.com/) or [Squoosh](https://squoosh.app/)
3. Rename it according to the convention above
4. Add it to this folder
5. Reference it in your questions.json file with a relative path like:
   ```json
   "image": {
     "url": "/images/albums/artist-name-album-title.jpg",
     "alt": "Artist Name - Album Title album cover"
   }
   ```

## Sample Album Covers

For the example questions, you'll need these album covers:

- `pink-floyd-dark-side-of-the-moon.jpg`
- `taylor-swift-1989.jpg`
- `beatles-abbey-road.jpg`
