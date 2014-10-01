function searchIN ()
	{
	var jsonStr = null;
	var mapping = woordnlMapping;
	scores = [];
	files= [];
	var str = document.getElementById('q').value;
	var gg = document.getElementById('results-toggle').checked;
	console.log("toggle:"+gg);
	
        $.getJSON("http://localhost:4000/woordnl-rc/get_search_results?term="+str,
			function(data)
			{
				jsonStr=data;
				count=jsonStr.ThemData.hits.total;
				//if (count>100) count=100;
				//count="<h1>"+count+" resultaaten</h1>"
				//console.log("count!");
				console.log(data);
				//$("#resultq").html(count);
				$("#Themresults").html("");
				var htmlcount=0;
				console.log("JSON RESULTS:"+jsonStr.ThemData.hits.hits.length);
				for (hit in jsonStr.ThemData.hits.hits)
				//for (i = 0; i < jsonStr.ThemData.hits.hits.length; i++)
				{
					//console.log("did it");
					
					file=jsonStr.ThemData.hits.hits[hit]._source.asr_file;
					console.log(jsonStr.ThemData.hits.hits[hit]);
					console.log(file);
					var asrs=file.split("\.");
					console.log(asrs[1]);
					var date,subtitle,broadcast,duration,title,highlight="";
					file=asrs[1];
					if (mapping[file])
					{
						title=mapping[file].titles[0].value;
						if (mapping[file].titles[1]) subtitle=mapping[file].titles[1].value;
						urn = mapping[file].urn;
						publish=mapping[file].publishStart;
						
						if (publish)
							{
							date=publish.split("T");
							var month=date[0].split("\-");
							var monthNames = [ "jan", "feb", "maa", "apr", "mei", "jun",
							"jul", "aug", "sep", "oct", "nov", "dec" ];
							var monthN=monthNames[month[1]-1];
							date=month[2]+" "+monthN+" "+month[0];
							}
						if (mapping[file].broadcasters) broadcast=mapping[file].broadcasters;
						if (mapping[file].duration) duration=mapping[file].duration;
						if (gg) {
							highlight=mapping[file].tags;
							}
						else	{
							for (word in jsonStr.ThemData.hits.hits[hit]._source.keywords)
								{
								highlight+=jsonStr.ThemData.hits.hits[hit]._source.keywords[word].word;
								highlight+=",";
								}
							}
						//console.log(mapping[file].tags);
						//<span class="highlight"> Test <em class="hlt1">Highlight</em></span> 
						html='  \
							<a href="http://localhost:4000/woordnl-rc/player.html?urn='+urn+'">\
							<div class="result program" data-urn="'+urn+'"> \
							 \
							<div class="visualisation">\
							</div><span class="title">'+title+'\
							<span class="publishDate">'+date+'</span>\
							</span><span class="subTitle">'+subtitle+'</span> <div class="highlights">\
							</div>\
							<div class="highlights"><span class="highlight">'+highlight+'</span></div>\
							<div class="meta"><span class="duration">'+duration+'</span><span class="genres">Interview</span>\
							<span class="broadcasters"> \
							<span class="broadcaster">'+broadcast+'</span></span> </div>\
							</div></a> ';
						if (gg)
						{	//console.log("gg is :"+gg);
							if ($.inArray(asrs[1], files)==-1)
								{
									files.push(asrs[1]);
									$("#Themresults").append(html);
									count="<h1>"+files.length+" resultaaten</h1>"
									$("#resultq").html(count);
									htmlcount+=1;
							
								}
						}
						else	{
							//console.log("gg is :"+gg);
							$("#Themresults").append(html);
							htmlcount+=1;
							
							}
					}
				
				}
				console.log("Got to END");
				console.log("unique results posted: "+htmlcount);
				htmlcount="<h1>"+htmlcount+" resultaaten</h1>"
				$("#resultq").html(htmlcount);
			});
	
	}
	