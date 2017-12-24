# Neighborhood Map
This app uses the bootstrap CSS framework, knockout JS framework, Google Maps API and Foursquare API to display a list of some tourist sites in NYC. [Demo site](https://gmapapp.herokuapp.com/)

## Files
The project has these files:
- img/
    - glyphicons-159-show-lines.png
- Css/
    - styles.css
- JavaScript/
    - script.js
- index.html

## Features
The app includes a list of tourist sites in NYC and shows markers for these places on a Google map. Each marker shows the site location and an image of the site when the marker is clicked. The list in the sidebar can be clicked and the corresponding marker will open an infowindow showing the location details.

The app also provides a search input to let user enter a search string for a location name. The search result is shown in the sidebar real-time with corresponding markers on the map.

The sidebar can be shown/hidden using the hamburger toggle button. The sidebar will be hidden automatically in small screen devices and shown by clicking the hamburger button.

## APIs
[Google Maps API](https://developers.google.com/maps/) is used to display the map and markers of site locations. [Foursquare API](https://developer.foursquare.com/) is used to retrieve information and image of a particular site.


## Usage
To run the app, open the index.html at the root folder.