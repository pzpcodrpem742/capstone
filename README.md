# Three.js Portfolio City

A 3D interactive portfolio where users can navigate a virtual city. Each building in the city represents a different aspect of the user's life or career.

## Features

- Virtual city with 12 buildings (6 in an inner circle and 6 in an outer circle)
- Controllable character for navigation
- Interactive building information displays
- First-person controls (WASD/Arrow keys and mouse)

## Technologies Used

- Three.js for 3D rendering
- JavaScript ES6+ with classes
- CSS3 for UI styling
- HTML5 Canvas

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:8080`

## Controls

- **W/Up Arrow**: Move forward
- **S/Down Arrow**: Move backward
- **A/Left Arrow**: Move left
- **D/Right Arrow**: Move right
- **Space**: Jump
- **Mouse**: Look around
- **Click**: Begin navigation (locks pointer)
- **Esc**: Exit navigation mode (unlocks pointer)

## Customization

You can customize the buildings and their information by editing the `createCity()` method in `src/js/main.js`. Each building can represent different aspects of your life or portfolio.

## Project Structure

- `index.html`: Main HTML file
- `src/css/style.css`: Styling for the application
- `src/js/main.js`: Main application code with Three.js implementation
- `src/assets/`: Directory for models and textures (not included in the base version)

## Future Enhancements

- Add more detailed building models
- Implement character model instead of camera-only movement
- Add day/night cycle
- Include more interactive elements within buildings
- Add sound effects and background music

## License

MIT 