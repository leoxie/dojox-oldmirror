define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo"
],function(declare, lang, arrayUtil, dojo){

	return declare("dojox.form.uploader._HTML5", [], {
		// summary:
		//		A mixin for dojox/form/Uploader that adds HTML5 multiple-file upload capabilities and
		//		progress events.
		//
		// description:
		//		Note that this does not add these capabilities to browsers that don't support them.
		//		For IE8 or older browsers, _IFrame or _Flash mixins will be used.
		//
		
		// debug message:
		errMsg:"Error uploading files. Try checking permissions",
	
		// Overwrites "form" and could possibly be overwritten again by iframe or flash plugin.
		uploadType:"html5",
		
		postMixInProperties: function(){
			this.inherited(arguments);
			if(this.uploadType === "html5"){ }
		},
	
		postCreate: function(){
			this.connectForm();
			this.inherited(arguments);
			if(this.uploadOnSelect){
				this.connect(this, "onChange", function(data){
					this.upload(data[0]);
				});
			}
		},
	
		_drop: function(e){
			dojo.stopEvent(e);
			var dt = e.dataTransfer;
			this._files = dt.files;
			this.onChange(this.getFileList());
		},
		/*************************
		 *	   Public Methods	 *
		 *************************/
	
		upload: function(/*Object ? */ formData){
			// summary:
			//		See: dojox.form.Uploader.upload
				
			this.onBegin(this.getFileList());
			this.uploadWithFormData(formData);
		},
	
		addDropTarget: function(node, /*Boolean?*/ onlyConnectDrop){
			// summary:
			//		Add a dom node which will act as the drop target area so user
			//		can drop files to this node.
			// description:
			//		If onlyConnectDrop is true, dragenter/dragover/dragleave events
			//		won't be connected to dojo.stopEvent, and they need to be
			//		canceled by user code to allow DnD files to happen.
			//		This API is only available in HTML5 plugin (only HTML5 allows
			//		DnD files).
			if(!onlyConnectDrop){
				this.connect(node, 'dragenter', dojo.stopEvent);
				this.connect(node, 'dragover', dojo.stopEvent);
				this.connect(node, 'dragleave', dojo.stopEvent);
			}
			this.connect(node, 'drop', '_drop');
		},
		
		uploadWithFormData: function(/*Object*/ data){
			// summary:
			//		Used with WebKit and Firefox 4+
			//		Upload files using the much friendlier FormData browser object.
			// tags:
			//		private
	
			if(!this.getUrl()){
				console.error("No upload url found.", this); return;
			}
			var fd = new FormData(), fieldName=this._getFileFieldName();
			arrayUtil.forEach(this._files, function(f, i){
				fd.append(fieldName, f);
			}, this);
	
			if(data){
				for(var nm in data){
					fd.append(nm, data[nm]);
				}
			}
	
			var xhr = this.createXhr();
			xhr.send(fd);
		},
	
		_xhrProgress: function(evt){
			if(evt.lengthComputable){
				var o = {
					bytesLoaded:evt.loaded,
					bytesTotal:evt.total,
					type:evt.type,
					timeStamp:evt.timeStamp
				};
				if(evt.type == "load"){
					// 100%
					o.percent = "100%";
					o.decimal = 1;
				}else{
					o.decimal = evt.loaded / evt.total;
					o.percent = Math.ceil((evt.loaded / evt.total)*100)+"%";
				}
				this.onProgress(o);
			}
		},
	
		createXhr: function(){
			var xhr = new XMLHttpRequest();
			var timer;
			xhr.upload.addEventListener("progress", lang.hitch(this, "_xhrProgress"), false);
			xhr.addEventListener("load", lang.hitch(this, "_xhrProgress"), false);
			xhr.addEventListener("error", lang.hitch(this, function(evt){
				this.onError(evt);
				clearInterval(timer);
			}), false);
			xhr.addEventListener("abort", lang.hitch(this, function(evt){
				this.onAbort(evt);
				clearInterval(timer);
			}), false);
			xhr.onreadystatechange = lang.hitch(this, function(){
				if(xhr.readyState === 4){
	//				console.info("COMPLETE")
					clearInterval(timer);
					this.onComplete(JSON.parse(xhr.responseText.replace(/^\{\}&&/,'')));
				}
			});
			xhr.open("POST", this.getUrl());
			xhr.setRequestHeader("Accept","application/json");
			
			timer = setInterval(lang.hitch(this, function(){
				try{
					if(typeof(xhr.statusText)){} // accessing this error throws an error. Awesomeness.
				}catch(e){
					//this.onError("Error uploading file."); // not always an error.
					clearInterval(timer);
				}
			}),250);
	
			return xhr;
		}
	
	});

});
