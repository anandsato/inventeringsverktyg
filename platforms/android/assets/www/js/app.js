function listSubmittedEntries() {
	if (localStorage.submittedEntries) {
		$("#list-submitted-entries").empty();
		var entries = JSON.parse(localStorage.submittedEntries);
		$.each(entries, function(key, val) {
			var datetime = new Date(val.timestamp + 3600 * 1000);
			datetime = datetime.toJSON().substring(0,16);
			$("<li><a  id='" + val.timestamp + "'>Sparad: " + datetime + "</a></li>").appendTo("#list-submitted-entries");
		});
	} else {
		$("<li>Du har inga sparade checklistor att ladda upp</li>").appendTo("#list-submitted-entries");
	}
	$('#list-submitted-entries').listview().listview('refresh');
}

function listPreviousSubmissions() {
	if (localStorage.previousSubmissions) {
		$.each(JSON.parse(localStorage.previousSubmissions), function(key, val) {
			var i = 0;
			if (i == 5) {
				return false;
			}
			var datetime = new Date(val.timestamp + 3600 * 1000);
			datetime = datetime.toJSON().substring(0,16);
			$("<li><a id='" + val.form_id + "' class='previousSubmissionObject' name=" + val.timestamp + "><h3>" + val.form_name + "</h3><p>Sparad: " + datetime + "</p></a></li>").appendTo("#list-all-previous-submissions");
			i++;
		});
		$('#list-all-previous-submissions').listview().listview('refresh');
	}
}

function arrayLengthSubmittedEntries(){
	if (localStorage.submittedEntries){
		var entries = JSON.parse(localStorage.submittedEntries);
		if (entries.length > 0) {
				$("#entries-array-length").html("- Du har " + entries.length + " formul&auml;r att ladda upp.");
		}
	}
}

function repopulateForm(previousSubmission) {
	// console.log(previousSubmission);
	$.each(previousSubmission, function(name, val) {
		var $el = $('[name="' + name + '"]'),
			type = $el.attr('type');
		switch (type) {
		case 'checkbox':
			if (val instanceof Array) {
				$.each(val, function(entry, value) {
					$el.filter('[value="' + value + '"]').attr('checked', 'checked');
				});
			} else {
				$el.filter('[value="' + val + '"]').attr('checked', 'checked');
			}
			break;
		case 'radio':
			$el.filter('[value="' + val + '"]').attr('checked', 'checked');
			break;
		default:
			$el.val(val);
		}
	});
}


function displayChecklist(checklistJson, previousSubmission) {

	$.mobile.navigate("#formpage"); 
	var create_form = $("#myform").dform(checklistJson);
	create_form.promise().done(function() {

		$.dform.addType("h2", function(options) {
			// Return a new button element that has all options that
			// don't have a registered subscriber as attributes
			return $("<h2>").dform('attr', options);
		});
		$.dform.addType("textarea", function(options) {
			// Return a new button element that has all options that
			// don't have a registered subscriber as attributes
			return $("<textarea>").dform('attr', options);
		});
		$('#formpage').trigger('create'); //apply jquery mobile styling
		//go to form page
		if (previousSubmission == undefined) {
			//console.log("previousSubmission is undefined!");
		} else {
			repopulateForm(previousSubmission);
		}

		if (checklistJson["name"]) {
			//console.log(checklistJson["name"]);
			$("#checklist-name").html(checklistJson["name"]);
		}
    
	});
}
//polyfill to see if string begins with another string. 
if (!String.prototype.startsWith) {
	Object.defineProperty(String.prototype, 'startsWith', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function(searchString, position) {
			position = position || 0;
			return this.lastIndexOf(searchString, position) === position;
		}
	});
}

function storePreviousSubmission(submittedEntryJson) {
	$.each(submittedEntryJson, function(key, val) {
		//delete any image base64 data
		if (val['name'].startsWith("imagedata")) {
			delete submittedEntryJson[key];
		}
	});
	//massage serializeArray output into form name/value format.
	var o = {};
	var a = submittedEntryJson;
	$.each(a, function() {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	//turn array into previousSubmission format.
	var previousSubmission = {};
	previousSubmission['form_id'] = o['form_id'];
	previousSubmission['form_name'] = o['form_name'];
	previousSubmission['submitted_entry'] = o;
	previousSubmission['timestamp'] = new Date().getTime();
	console.log(previousSubmission);
	var allEntries;
	if (localStorage.previousSubmissions) {
		allEntries = JSON.parse(localStorage.previousSubmissions);
	} else {
		allEntries = [];
	}
	allEntries.unshift(previousSubmission);
	if (allEntries.length > 5) {
		allEntries.pop();
	}
	localStorage.previousSubmissions = JSON.stringify(allEntries);
}

function storeSubmittedEntry(submittedEntryString, formId) {
	var newEntry = {};
	newEntry['timestamp'] = new Date().getTime();
	newEntry['submission_string'] = submittedEntryString;
	newEntry['form_id'] = formId;
	var allSubmittedEntries;
	if (localStorage.submittedEntries) {
		allSubmittedEntries = JSON.parse(localStorage.submittedEntries);
	} else {
		allSubmittedEntries = [];
	}
	allSubmittedEntries.push(newEntry);
	localStorage.submittedEntries = JSON.stringify(allSubmittedEntries);
}

function uploadSubmittedEntries() {
	if (localStorage.submittedEntries) {
		var entries = JSON.parse(localStorage.submittedEntries);
		var entries_length = entries.length;
		var i = 0;
		$.each(entries, function(key, val) {
			i++;
			var upload = $.ajax({
				type: 'POST',
				url: "http://fonstertitt.appspot.com/submit",
				data: val.submission_string,
				crossDomain: true
			});
			upload.promise().done(function(data) {
				
				if (data == val.form_id) {
					//alert(JSON.stringify(data));
					var $el = $("#" + val.timestamp);
					$("<p>Uppladdningen lyckades!</p>").appendTo($el);
					$el.fadeOut(2300, function() {
						$(this).remove();
					}); //delete this one to save energy
					if (i == entries_length) {
						localStorage.submittedEntries = "";
					}
				} else {
					alert("uppladdningen stoppade!" + JSON.stringify(data) );
					return false;
				}
			}).fail(function(data) {
				alert("uppladdningen misslyckades!" + JSON.stringify(data));
			});
		});
		//document.location.href = 'index.html';
	}
}
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {

	cordova.exec.setJsToNativeBridgeMode(cordova.exec.jsToNativeModes.XHR_NO_PAYLOAD);

	function addHiddenElement(elementId, imgData) {
		$("<input>", {
			type: "hidden",
			name: "imagedata" + elementId,
			id: "imagedata" + elementId,
			value: "data:image/jpeg;base64," + imgData
		}).insertAfter("#" + elementId);
		$("<a>", {
			class: "del-image-input",
			href: "#",
			id: elementId
		}).html("Ta bort bild").insertAfter("#" + elementId);
	}

	$(document).on('click', '.camera', function() {
		if (!navigator.camera) {
			alert("Camera API not supported", "Error");
			return;
		}
		var options = {
			quality: 65,
			destinationType: Camera.DestinationType.DATA_URL,
			sourceType: 1,
			// 0:Photo Library, 1=Camera, 2=Saved Album
			encodingType: 0,
			// 0=JPG 1=PNG
			correctOrientation: true,
			targetWidth: 700,
			targetHeight: 700
		};

		function imageData(elementId) {
			navigator.camera.getPicture(function(imgData) {
				addHiddenElement(elementId, imgData);
				//return imgData; 
			}, function() {
				alert('Fel, bildfunktionen fungerar inte');
			}, options);
		}
		imageData(this.id);
	});
	//check and display network connection on submitted entries page.
	setInterval(function() {
		if (navigator.connection.type !== Connection.NONE) {
			$("#connection").html("- Du &auml;r uppkopplad till internet.");
			//$(".submitentry").removeAttr("disabled");
		} else {
			$("#connection").html("- Du har ingen anslutning till internet och kan inte skicka checklistor till servern.");
			//$("#upload-submitted-entries").addClass('ui-disabled');
			//$("").target("create");
		}
	}, 5250);
	$(document).on("submit", "form", function(event) {
		var formId = $("input[name='form_id']").attr("value");
		console.log(formId);
		event.preventDefault();
		event.stopPropagation();
		var submittedEntryJson = $(this).serializeArray();
		storePreviousSubmission(submittedEntryJson);
		var submittedEntryString = $(this).serialize();

		storeSubmittedEntry(submittedEntryString, formId);
		alert("Checklistan sparad.");
		
		document.location.href = 'index.html';
	});

	var allChecklists;

	if (localStorage.checklists){
		allChecklists = JSON.parse(localStorage.checklists);
	}

	function updateChecklists() {
		if (allChecklists != undefined){
			alert("vi har en variabel");
		}
		if (!localStorage.checklists || navigator.connection.type !== Connection.NONE) {
			var requestAllForms = $.getJSON("http://fonstertitt.appspot.com/list-all-forms");
			requestAllForms.promise().done(function(data) {
				localStorage.removeItem("checklists");
				localStorage.checklists = JSON.stringify(data);
				
				$.each(data, function(key, val) {
					$("<li><a class='checklistObject' id='" + val.id + "'>" + val.name + "</a></li>").appendTo("#list-all-forms");
				});
				$('#list-all-forms').listview().listview('refresh');
			});
		} else {
			$("#list-all-forms").remove();
			$.each(allChecklists, function(key, val) {
				$("<li><a class='checklistObject' id='" + val.id + "'>" + val.name + "</a></li>").appendTo("#list-all-forms");
			});
			$('#list-all-forms').listview().listview('refresh');
		}
	}
	updateChecklists();
	arrayLengthSubmittedEntries();

	$("#reload-checklists").click(function() {
		$('#list-all-forms').empty();
		updateChecklists();
	});

	$("#backwards").click(function() {
		document.location.href = 'index.html';
	});

	$("#reload-app").click(function() {
		document.location.href = 'index.html';
	});

	$("#remove-previous-submissions").click(function() {
		alert("Nu kommer vi ta bort tidigare sparade checklistor.");
		localStorage.previousSubmissions = "";
		if (localStorage.previousSubmissions) {
			console.log("not empty");
		} else {
			console.log("empty!");
		}
		document.location.href = 'index.html';
	});

	

	listSubmittedEntries();
	listPreviousSubmissions();
	$(document).on('click', '.checklistObject', function() {
		var element_id = $(this).attr("id");
		$.each(allChecklists, function(key, val) {
			if (val.id == element_id) {
				displayChecklist(val, undefined);
			}
		});
	});
	$(document).on('click', '.previousSubmissionObject', function() {
		var previousSubmissions = JSON.parse(localStorage.previousSubmissions);
		var allChecklistObjects = JSON.parse(localStorage.checklists);
		var element_id = this.id;
		var element_timestamp = this.name;
		$.each(allChecklistObjects, function(key, val) {
			if (val.id == element_id) {
				$.each(previousSubmissions, function(key2, value) {
					if (value.timestamp == element_timestamp) {
						displayChecklist(val, value.submitted_entry);
					}
				});
			}
		});
	});
	$("#backwards").click(function() {
		$("form").empty();
		$("form").attr("id", "myform");
	});
	$("#upload-submitted-entries").click(function() {
		uploadSubmittedEntries();
	});
	$("#upload-submitted-entries2").click(function() {
		uploadSubmittedEntries();
	});


	//Remove uploaded/converted image i.e empty image src, remove hidden base64 image and its name and delete button.
	$(document).on("click", ".del-image-input", function() {
		imageId = $(this).attr("id");
		imageVar = "#outputImage" + imageId;
		//$("#image" + imageId).attr('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==') //replace image with transparent gif :)
		//$("#imagename" + imageId).remove(); //delete imagename
		$("a#" + imageId + ".del-image-input").remove(); //delete "remove image" handler.
		$("#imagedata" + imageId).remove();
	});
}