(function () {
  'use strict';
}());

// Foursquare API keys
const FQ_CLIENT_ID	= 'DZC5DIQBP1R4IOQPHB3DFPSH3DSAXRK0BLXA3BQPS0XOA1KK';
const FQ_CLIENT_SECRET = 'A3AVF543ASWLMB4WAJQV41V0WYQRDQMEIEOYFMQ4ZYPCE5PE';


var ViewModel = function() {
	var self = this;
	this.map = null;
	this.markers = {};
	this.places = {};
	this.photoSrcs = {};
	this.placeDetails = ko.observable('');
	this.imgTag = ko.observable('');
	this.searchString = ko.observable('');
	this.activeString = ko.observable('');
	this.sidebarOpen = ko.observable(false);

	// Define neighborhood locations
	this.locations = (function() {
		var locations = [
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
		locations.forEach(function(location) {
			location.lowercase = location.title.trim().toLowerCase();
		});
		return locations;
	})();

	// Filter neighborhood locations when a search string is entered
	this.computedLocations = ko.computed(function() {
		// Filter markers to display when filtering neighborhood locations
		if (this.filteredMarkers) {
			this.hideMarkers(this.filteredMarkers);
		}
		var filteredLocations = [];
		this.filteredMarkers = {};
		var searchStringLowercase = this.searchString().trim().toLowerCase();
		// Search the location for the entered string
		if (searchStringLowercase) {
			this.locations.forEach(function(location) {
				var index = location.lowercase.indexOf(searchStringLowercase);
				if ( index !== -1) {
					lat = location.location.lat;
					lng = location.location.lng;
					filteredLocations.push({ title: location.title });
					self.filteredMarkers[location.title] = self.markers[
						location.title];
				}
			});
		} else {
			this.filteredMarkers = this.markers;
			filteredLocations = this.locations;
		}
		this.showMarkers(this.filteredMarkers);
		return filteredLocations;
	}, this, { deferEvaluation: true });

	/**
	* @description Show or hide list view sidebar when the toggle button is
	* clicked
	*/
	this.toggleSidebar = function() {
		if (this.sidebarOpen()) {
			this.sidebarOpen(false);
			google.maps.event.trigger(this.map, 'resize');
		} else {
			this.sidebarOpen(true);
		}
	};

	/**
	* @description Animate the marker when it is clicked
	* @param {google.maps.Marker} marker
	*/
	this.toggleBounce = function(marker) {
		marker.setAnimation(google.maps.Animation.BOUNCE);
		window.setTimeout(function() {
			marker.setAnimation(null);
		}, 1400);
	};

	/**
	* @description Populate infowindow with information retrieved from the
	* Foursquare API
	* @param {google.maps.Marker} marker
	* @param {google.maps.InfoWindow} infowindow
	*/
	this.populateInfoWindow = function(marker, infowindow) {
		if (infowindow.marker != marker) {
			infowindow.marker = marker;
			var place = this.places[marker.getTitle()];
			if (place) {
				this.displayContentInfowindow(place, marker, infowindow);
				var photoSrc = this.photoSrcs[marker.getTitle()];
				if (photoSrc) {
					this.displayPhotoInfowindow(photoSrc);
				}
			} else {
				this.getPlacesDetails(marker, infowindow);
			}
			infowindow.addListener('closeclick', function() {
				infowindow.marker = null;
				self.activeString('');
			});
		}
		this.toggleBounce(marker);
	};

	/**
	* @description Highlight selected list view item and show corresponding
	* marker
	* @param {Object} location
	*/
	this.showCurrentMarker = function(location) {
		self.activeString(location.title);
		self.populateInfoWindow(
			self.markers[location.title], self.infowindow);
	};

	/**
	* @description Show markers and adjust view on the map
	* @param {google.maps.Marker} marker
	*/
	this.showMarkersFitted = function(markers) {
		if (typeof(google) != 'undefined') {
			var bounds = new google.maps.LatLngBounds();
			for (var marker in markers) {
				if (markers.hasOwnProperty(marker)) {
					markers[marker].setMap(this.map);
					bounds.extend(markers[marker].position);
				}
			}
			this.map.fitBounds(bounds);
		}
	};

	/**
	* @description Show markers
	* @param {Object} markers
	*/
	this.showMarkers = function(markers) {
		for (var marker in markers) {
			if (markers.hasOwnProperty(marker)) {
				markers[marker].setVisible(true);
			}
		}
	};

	/**
	* @description Hide markers
	* @param {Object} markers
	*/
	this.hideMarkers = function(markers) {
		for (var marker in markers) {
			if (markers.hasOwnProperty(marker)) {
				markers[marker].setVisible(false);
			}
		}
	};

	/**
	* @description Retrieve location information from the Foursquare API
	* Foursquare API
	* @param {google.maps.Marker} marker
	* @param {google.maps.InfoWindow} infowindow
	*/
	this.getPlacesDetails = function(marker, infowindow) {
		var venue_url = 'https://api.foursquare.com/v2/venues/search?v=20171210&intent=match&ll=' +
			marker.getPosition().toUrlValue() +
			'&name="' + marker.getTitle() +
			'"&client_id=' + FQ_CLIENT_ID +
			'&client_secret=' + FQ_CLIENT_SECRET;
		$.getJSON(venue_url, function(result) {
			var place = result.response.venues[0];
			self.places[marker.getTitle()] = place;
			self.getVenuPhoto(place.id, marker, infowindow);
			self.displayContentInfowindow(place, marker, infowindow);
		}).fail(function(jqxhr, textStatus, error) {
			var err = textStatus + ', ' + error;
			infowindow.open(this.map, marker);
			infowindow.setContent('Request Failed: ' + err);
		});
	};

	/**
	* @description Retrieve location image from the Foursquare API
	* @param {String} photoId
	* @param {google.maps.InfoWindow} infowindow
	*/
	this.getVenuPhoto = function(photoId, marker, infowindow) {
		var venue_photo = 'https://api.foursquare.com/v2/venues/' + photoId +
			'/photos?v=20171216&limit=1&client_id=' + FQ_CLIENT_ID +
			'&client_secret=' + FQ_CLIENT_SECRET;
		$.getJSON(venue_photo, function(result) {
			var photo = result.response.photos.items[0];
			if (photo && infowindow.marker) {
				var photoSrc = photo.prefix + 'cap200' + photo.suffix;
				self.photoSrcs[marker.getTitle()] = photoSrc;
				self.displayPhotoInfowindow(photoSrc);
			}
		}).fail(function(jqxhr, textStatus, error) {
			var err = textStatus + ', ' + error;
			ko.cleanNode(document.getElementById('venuePhoto'));
			ko.applyBindings(self, document.getElementById('venuePhoto'));
			self.imgTag('Request Failed: ' + err);
		});
	};

	/**
	* @description Display the retrieved information in the InfoWindow
	* @param {Object} place
	* @param {google.maps.Marker} marker
	* @param {google.maps.InfoWindow} infowindow
	*/
	this.displayContentInfowindow = function(place, marker, infowindow) {
		var innerHTML = '<div>';
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
		innerHTML += '<div id="venuePhoto" data-bind="html: imgTag"></div>';
		innerHTML += '</div>';
		infowindow.setContent('<div id="infoContent" data-bind="html: placeDetails"></div>');
		infowindow.open(this.map, marker);
		ko.cleanNode(document.getElementById('infoContent'));
		ko.applyBindings(self, document.getElementById('infoContent'));
		self.placeDetails(innerHTML);
	};

	/**
	* @description Display the retrieved photo in the InfoWindow
	* @param {String} photoSrc
	*/
	this.displayPhotoInfowindow = function(photoSrc) {
		var innerHTML = '<img src="' + photoSrc + '">';
		ko.cleanNode(document.getElementById('venuePhoto'));
		ko.applyBindings(self, document.getElementById('venuePhoto'));
		self.imgTag(innerHTML);
	};
};


var viewModel = new ViewModel();
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
	for (var i = 0; i < viewModel.locations.length; i++) {
		var marker = new google.maps.Marker({
			position: viewModel.locations[i].location,
			title: viewModel.locations[i].title,
			animation: google.maps.Animation.DROP,
			id: i
		});
		viewModel.markers[viewModel.locations[i].title]= marker;
		marker.addListener('click', showCon(marker));
	}

	// Show all markers initially
	viewModel.showMarkersFitted(viewModel.markers);
}
function showCon(marker) {
	return function() {
		viewModel.populateInfoWindow(marker, viewModel.infowindow);
		viewModel.activeString(marker.getTitle());
	};
}

// Handle google map error
function googleMapErr(error) {
	$('#map').html('Google map error occured');
}