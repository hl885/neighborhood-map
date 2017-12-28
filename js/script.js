(function () {
  'use strict';
}());

// Foursquare API keys
const FQ_CLIENT_ID	= 'DZC5DIQBP1R4IOQPHB3DFPSH3DSAXRK0BLXA3BQPS0XOA1KK';
const FQ_CLIENT_SECRET = 'A3AVF543ASWLMB4WAJQV41V0WYQRDQMEIEOYFMQ4ZYPCE5PE';

// Define neighborhood locations
const locations = (function() {
	let locations = [
		{
			title: 'Tenement Museum',
			location: {lat: 40.718796, lng: -73.99007}
		},
		{
			title: 'Whitney Museum of American Art',
			location: {lat: 40.739588, lng: -74.008863}
		},
		{
			title: 'Empire State Building',
			location: {lat: 40.748541, lng: -73.985758}
		},
		{
			title: 'Rockefeller Center',
			location: {lat: 40.758834, lng: -73.978342}
		},
		{
			title: 'Columbus Circle',
			location: {lat: 40.768044, lng: -73.982372}
		},
		{
			title: 'The Museum of Modern Art',
			location: {lat: 40.761433, lng: -73.977622}
		},
		{
			title: 'One World Trade Center',
			location: {lat: 40.713008, lng: -74.013169}},
		{
			title: 'United Nations Headquarters',
			location: {lat: 40.748876, lng: -73.968009}
		}
	];
	locations.forEach(location => {
		location.lowercase = location.title.trim().toLowerCase();
	});
	return locations;
})();

class ViewModel {
	constructor() {
		this.map = null;
		this.markers = {};
		this.places = {};
		this.photoSrcs = {};
		this.placeDetails = ko.observable('');
		this.imgTag = ko.observable('');
		this.searchString = ko.observable('');
		this.activeString = ko.observable('');
		this.sidebarOpen = ko.observable(false);
		// Filter neighborhood locations when a search string is entered
		this.computedLocations = ko.computed(function() {
			// Filter markers to display when filtering neighborhood locations
			if (this.filteredMarkers) {
				this.hideMarkers(this.filteredMarkers);
			}
			let filteredLocations = [];
			this.filteredMarkers = {};
			const searchStringLowercase = this.searchString().trim().toLowerCase();
			// Search the location for the entered string
			if (searchStringLowercase) {
				locations.forEach(location => {
					const index = location.lowercase.indexOf(searchStringLowercase);
					if ( index !== -1) {
						const lat = location.location.lat;
						const lng = location.location.lng;
						const title = location.title;
						filteredLocations.push({ title });
						this.filteredMarkers[title] = this.markers[title];
					}
				});
			} else {
				this.filteredMarkers = this.markers;
				filteredLocations = locations;
			}
			this.showMarkers(this.filteredMarkers);
			return filteredLocations;
		}, this, { deferEvaluation: true });
		ViewModel.self = this;
	}

	/**
	* @description Show or hide list view sidebar when the toggle button is
	* clicked
	*/
	toggleSidebar() {
		if (this.sidebarOpen()) {
			this.sidebarOpen(false);
			google.maps.event.trigger(this.map, 'resize');
		} else {
			this.sidebarOpen(true);
		}
	}

	/**
	* @description Animate the marker when it is clicked
	* @param {google.maps.Marker} marker
	*/
	toggleBounce(marker) {
		marker.setAnimation(google.maps.Animation.BOUNCE);
		window.setTimeout(() => {
			marker.setAnimation(null);
		}, 1400);
	}

	/**
	* @description Populate infowindow with information retrieved from the
	* Foursquare API
	* @param {google.maps.Marker} marker
	* @param {google.maps.InfoWindow} infowindow
	*/
	populateInfoWindow(marker, infowindow) {
		if (infowindow.marker != marker) {
			infowindow.marker = marker;
			const place = this.places[marker.getTitle()];
			if (place) {
				this.displayContentInfowindow(place, marker, infowindow);
				const photoSrc = this.photoSrcs[marker.getTitle()];
				if (photoSrc) {
					this.displayPhotoInfowindow(photoSrc);
				}
			} else {
				this.getPlacesDetails(marker, infowindow);
			}
			infowindow.addListener('closeclick', () => {
				infowindow.marker = null;
				this.activeString('');
			});
		}
		this.toggleBounce(marker);
	}

	/**
	* @description Highlight selected list view item and show corresponding
	* marker
	* @param {Object} location
	*/
	showCurrentMarker(location) {
		ViewModel.self.activeString(location.title);
		ViewModel.self.populateInfoWindow(
			ViewModel.self.markers[location.title], ViewModel.self.infowindow);
	}

	/**
	* @description Show markers and adjust view on the map
	* @param {google.maps.Marker} marker
	*/
	showMarkersFitted(markers) {
		if (typeof(google) != 'undefined') {
			let bounds = new google.maps.LatLngBounds();
			for (const marker in markers) {
				if (markers.hasOwnProperty(marker)) {
					markers[marker].setMap(this.map);
					bounds.extend(markers[marker].position);
				}
			}
			this.map.fitBounds(bounds);
		}
	}

	/**
	* @description Show markers
	* @param {Object} markers
	*/
	showMarkers(markers) {
		for (const marker in markers) {
			if (markers.hasOwnProperty(marker)) {
				markers[marker].setVisible(true);
			}
		}
	}

	/**
	* @description Hide markers
	* @param {Object} markers
	*/
	hideMarkers(markers) {
		for (const marker in markers) {
			if (markers.hasOwnProperty(marker)) {
				markers[marker].setVisible(false);
			}
		}
	}

	/**
	* @description Retrieve location information from the Foursquare API
	* Foursquare API
	* @param {google.maps.Marker} marker
	* @param {google.maps.InfoWindow} infowindow
	*/
	getPlacesDetails(marker, infowindow) {
		const venue_url = 'https://api.foursquare.com/v2/venues/search?v=20171210&intent=match&ll=' +
			marker.getPosition().toUrlValue() +
			'&name="' + marker.getTitle() +
			'"&client_id=' + FQ_CLIENT_ID +
			'&client_secret=' + FQ_CLIENT_SECRET;
		$.getJSON(venue_url, result => {
			const place = result.response.venues[0];
			this.places[marker.getTitle()] = place;
			this.getVenuPhoto(place.id, marker, infowindow);
			this.displayContentInfowindow(place, marker, infowindow);
		}).fail((jqxhr, textStatus, error) => {
			const err = textStatus + ', ' + error;
			infowindow.open(this.map, marker);
			infowindow.setContent('Request Failed: ' + err);
		});
	}

	/**
	* @description Retrieve location image from the Foursquare API
	* @param {String} photoId
	* @param {google.maps.InfoWindow} infowindow
	*/
	getVenuPhoto(photoId, marker, infowindow) {
		const venue_photo = 'https://api.foursquare.com/v2/venues/' + photoId +
			'/photos?v=20171216&limit=1&client_id=' + FQ_CLIENT_ID +
			'&client_secret=' + FQ_CLIENT_SECRET;
		$.getJSON(venue_photo, result => {
			const photo = result.response.photos.items[0];
			if (photo && infowindow.marker) {
				const photoSrc = photo.prefix + 'cap200' + photo.suffix;
				this.photoSrcs[marker.getTitle()] = photoSrc;
				this.displayPhotoInfowindow(photoSrc);
			}
		}).fail((jqxhr, textStatus, error) => {
			const err = textStatus + ', ' + error;
			ko.cleanNode(document.getElementById('venuePhoto'));
			ko.applyBindings(this, document.getElementById('venuePhoto'));
			this.imgTag('Request Failed: ' + err);
		});
	}

	/**
	* @description Display the retrieved information in the InfoWindow
	* @param {Object} place
	* @param {google.maps.Marker} marker
	* @param {google.maps.InfoWindow} infowindow
	*/
	displayContentInfowindow(place, marker, infowindow) {
		let innerHTML = '<div>';
		if (place.name) {
			innerHTML += '<strong>' + place.name + '</strong><br>';
		}
		if (place.location.formattedAddress) {
			innerHTML += '<br>' +
				place.location.formattedAddress.join('<br>');
		}
		if (place.contact.formattedPhone) {
			innerHTML += '<br>' + place.contact.formattedPhone;
		}
		innerHTML += `<div id="venuePhoto" data-bind="html: imgTag"></div>
					  </div>
					  <div>Powered by<a target="_blank" href="https://foursquare.com/">Foursquare</a>
					  </div>`;
		infowindow.setContent('<div id="infoContent" data-bind="html: placeDetails"></div>');
		infowindow.open(this.map, marker);
		ko.cleanNode(document.getElementById('infoContent'));
		ko.applyBindings(ViewModel.self, document.getElementById('infoContent'));
		ViewModel.self.placeDetails(innerHTML);
	}

	/**
	* @description Display the retrieved photo in the InfoWindow
	* @param {String} photoSrc
	*/
	displayPhotoInfowindow(photoSrc) {
		const innerHTML = `<img src="${photoSrc}">`;
		ko.cleanNode(document.getElementById('venuePhoto'));
		ko.applyBindings(ViewModel.self, document.getElementById('venuePhoto'));
		ViewModel.self.imgTag(innerHTML);
	}
};


const viewModel = new ViewModel();
ko.applyBindings(viewModel);


// Show or hide list view sidebar depending on browser window size
if($(window).width() >= 767) {
	viewModel.sidebarOpen(true);
}


$(window).on('resize', function(event){
	if($(window).width() >= 767) {
		viewModel.sidebarOpen(true);
	} else {
		viewModel.sidebarOpen(false);
		google.maps.event.trigger(viewModel.map, 'resize');
	}
});


/**
* @description Google map callback function
*/
function initMap() {
	// Initialize the map
	viewModel.map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 40.7413549, lng: -73.9980244},
		zoom: 13
	});

	// Create a marker with infowindow for each neighborhood location
	viewModel.infowindow = new google.maps.InfoWindow();
	for (let i = 0; i < locations.length; i++) {
		let marker = new google.maps.Marker({
			position: locations[i].location,
			title: locations[i].title,
			animation: google.maps.Animation.DROP,
			id: i
		});
		viewModel.markers[locations[i].title]= marker;
		marker.addListener('click', showCon(marker));
	}

	// Show all markers initially
	viewModel.showMarkersFitted(viewModel.markers);
}
function showCon(marker) {
	return () => {
		viewModel.populateInfoWindow(marker, viewModel.infowindow);
		viewModel.activeString(marker.getTitle());
	};
}

// Handle google map error
function googleMapErr(error) {
	$('#map').html('Google map error occured');
}