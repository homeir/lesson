# Senegal Electricity Grid Analysis Application

This application displays the electricity transmission network of Senegal and provides functionality to filter by voltage level and view substation and power plant locations.

## Features

1. Display Senegal's electricity transmission network on Google Maps
2. Show different voltage levels (225kV, 90kV, 30kV) with different colors
3. Display substation locations, including 225kV and 90kV substations
4. Show station names on the map when lines have origin and destination information
5. Filter lines by voltage level
6. Toggle display of origin and destination station labels
7. Display power plants by type (Solar, Wind, Hydro, Energy Storage, Heavy Fuel Oil)
8. Filter power plants by type
9. Switch between different map types (Road Map, Satellite, Hybrid, Terrain)

## Usage Instructions

1. Open the `index.html` file in a browser
2. Use the checkboxes in the top-left corner to filter lines by voltage level
3. Use the "Station Labels" section to toggle the display of origin and destination station names
4. Use the "Power Plants" section to filter power plants by type
5. Use the "Map Type" section to switch between different map views (Road Map, Satellite, Hybrid, Terrain)
6. Click on substations or power plants to view detailed information
7. Click on lines to view detailed information about the transmission line

## Data Sources

- Grid data from `Senegal Electricity Transmission Network.kml` file
- Substation data from `substations.json` file
- Power plant data from `plants.json` file

## Substation Information

### 225kV Substations (7)
- Kounoune
- Tobene
- Touba
- Kaolack
- Malicounda
- Diass
- Ndindy

### 90kV Substations (11)
- Cap des Biches
- Bel Air
- Hann
- University
- Patte d'Oie
- Airport
- Mbao
- Diawana
- Sococim
- Ouaram
- Someta

## Power Plant Information

### Solar Power Plants
- Bokhol Solar Plant
- Malicounda Solar Plant
- Kahone Solar Plant
- Santhiou Mékhé Solar Plant
- Ten Merina Solar Plant
- Diass Solar Plant

### Wind Power Plants
- Taiba Ndiaye Wind Farm

### Hydro Power Plants
- Manantali Dam
- Félou Hydroelectric Plant

### Energy Storage Facilities
- Dakar Energy Storage
- Diass Energy Storage
- Touba Energy Storage

### Heavy Fuel Oil Plants
- Cap des Biches Power Plant
- Kounoune Power Plant
- Sendou Power Plant
- Tobene Power Plant
- Malicounda Power Plant

## Technical Implementation

- Uses Google Maps JavaScript API to display the map
- Uses JavaScript to parse KML file data
- Built with HTML/CSS/JavaScript for user interface and interaction 