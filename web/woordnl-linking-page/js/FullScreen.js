
      var count = 0;
      var imageList = [];
            function fullImager(addr1,addr2,addr3)
            {
		
		
                addr1 = addr1.replace("188x188", "1280x1280");
                addr2 = addr2.replace("188x188", "1280x1280");
                addr3 = addr3.replace("188x188", "1280x1280");
                document.getElementById("FSimage").style = "display:block";
                imageList.push(addr1,addr2,addr3);
		var test=document.getElementByClass("media-metadata-description");
		console.log(test);
            
                enterFullScreen();
            
            }
	    
	    function replaceContentInContainer(matchClass, content)
		{
			var elems = document.getElementsByTagName('*'), i;
			for (i in elems) {
				 if((' ' + elems[i].className + ' ').indexOf(' ' + matchClass + ' ')> -1)
					{
					elems[i].innerHTML = content;
					}
				}
		}
			

            function enterFullScreen() 	//invoke this when user wants to see a Full Screen Slideshow
            {
                    var elem = document.getElementById("FSimage");
		    elem.style.display = "block";
                    //show full screen
                    if(elem.requestFullScreen) {
                    elem.requestFullScreen();
                  } else if(elem.webkitRequestFullScreen ) {
                    elem.webkitRequestFullScreen();
                  } else if(elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                  }
                             
                    setTimeout(changePicture, 3000);
            }
            
            function changePicture(){

                count++;		//cycle through the list of images
                //document.getElementById("FSimage").src = imageList[count % imageList.length];
                
		if (document.fullscreenElement ||document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||document.msFullscreenElement) 
                    
		     setTimeout(changePicture, 3000);
		    
                else	
			//if user exits the full screen mode 
			{
			while(imageList.length > 0) {imageList.pop();}
			//document.getElementById("FSimage").style.display = "none";
			console.log("i am out of FULLSCREEN");
			}
			
			
                    
                    
                    
                    
            }
   