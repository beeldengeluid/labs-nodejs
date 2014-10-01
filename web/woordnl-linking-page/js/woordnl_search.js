function searchIN ()
	{
	var jsonStr = null;
	var mapping = woordnlMapping;
	scores = [];
	files= [];
	var str = document.getElementById('q').value;
	var gg = document.getElementById('results-toggle').checked;
    $.getJSON("http://rdlabs.beeldengeluid.nl/woordnl-rc/get_search_results?term="+str,
		function(data)
		{
			jsonStr=data;
			count=jsonStr.ThemData.hits.total;				
			console.log(data);
			$("#Themresults").html("");
			var htmlcount=0;
			for (hit in jsonStr.ThemData.hits.hits)
			{
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
					var start = gg ? 0 : jsonStr.ThemData.hits.hits[hit]._source.start;
					var html='  \
						<a href="http://rdlabs.beeldengeluid.nl/woordnl-rc/player.html?urn='+urn+'&start='+start+'">\
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
	