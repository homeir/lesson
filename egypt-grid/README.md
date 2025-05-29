# Egypt Transmission Network Analysis System

This is a Egypt transmission network visualization and analysis system based on Google Maps, specifically designed to display and analyze Egypt's transmission line network.

## Updates

### Data Structure Optimization
- Updated data structure based on the latest GeoJSON data
- Uses `transmissionPower` attribute to represent voltage levels (supports 500kV and 225kV)
- Uses `lineType` attribute to represent line types (single/double circuit lines)
- Removed substation and power plant related functions, focusing on transmission line network

### Voltage Levels and Color Mapping
- **500kV Lines**: Red (#FF0000) - Line width 6px
- **400kV Lines**: Orange Red (#FF4500) - Line width 5px
- **275kV Lines**: Orange (#FFA500) - Line width 4px
- **225kV Lines**: Gold (#FFD700) - Line width 3.5px
- **150kV Lines**: Blue (#0000FF) - Line width 3px
- **110kV Lines**: Purple (#800080) - Line width 2.5px
- **60kV Lines**: Green (#008000) - Line width 2px
- **<60kV Lines**: Gray (#808080) - Line width 1.5px

### Line Type Differentiation
- **Single Circuit Lines**: Standard line width
- **Double Circuit Lines**: Line width increased by 1.5x, better distinguishing line capacity

### Interface Optimization
- Complete English interface for better user experience
- Simplified control panel, removed unnecessary options
- Optimized legend display, clearly showing voltage levels and line types
- Updated map center point to Egypt's geographical center

### Interactive Features
- Click on lines to display detailed information (voltage level, line type, length, connected nodes)
- Voltage level filtering functionality
- Map type switching (road, satellite, hybrid, terrain)
- Statistics display
- Current view saving and sharing functionality

## Technical Features

- High-performance map rendering based on Google Maps API
- Support for GeoJSON format geographical data
- Responsive design, adaptable to different screen sizes
- Real-time statistics and data filtering
- URL state saving, supporting bookmarks and sharing

## File Structure

- `index.html` - Main page file
- `app.js` - Core JavaScript application logic
- `transmissionlines.geojson` - Transmission line geographical data
- `README.md` - Project documentation

## Usage Instructions

1. Open the project in an environment with HTTP server
2. Access the `index.html` file
3. Use the left control panel to adjust display options and filters
4. Click on lines to view detailed information
5. Use the bottom-right legend to understand colors and symbols

## Data Sources

The transmission line data used in the project comes from Egypt's official electrical grid geographical information, including the main high-voltage transmission line network topology. 