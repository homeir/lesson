# Senegal Electricity Grid Analysis Application

This application displays the electricity transmission network of Senegal and provides functionality to filter by voltage level and view substation locations.

## Features

1. Display Senegal's electricity transmission network on Google Maps
2. Show different voltage levels (225kV, 90kV, 30kV) with different colors
3. Display substation locations, including 225kV and 90kV substations
4. Show station names on the map when lines have origin and destination information
5. Filter lines by voltage level
6. Toggle display of origin and destination station labels

## Usage Instructions

1. Open the `index.html` file in a browser
2. Use the checkboxes in the top-left corner to filter lines by voltage level
3. Use the "Station Labels" section to toggle the display of origin and destination station names
4. Click on substations to view detailed information
5. Click on lines to view detailed information about the transmission line

## Data Sources

- Grid data from `Senegal Electricity Transmission Network.kml` file
- Substation data from `substations.json` file

## Substation Information

### 225kV Substations (6)
- Kounoune
- Tobene
- Touba
- Kaolack
- Malikunda
- Diass

### 90kV Substations (13)
- Cap des Biches
- Bel Air
- Hann
- University
- Patte d'Oie
- Airport
- Mbao
- Kounoune
- Tobene
- Diawana
- Sococim
- Ouaram
- Someta

## Technical Implementation

- Uses Google Maps JavaScript API to display the map
- Uses JavaScript to parse KML file data
- Built with HTML/CSS/JavaScript for user interface and interaction 