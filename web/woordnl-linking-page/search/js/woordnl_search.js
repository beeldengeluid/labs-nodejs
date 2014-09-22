function searchIN ()
	{
	var jsonStr = null;
	scores = [];
	files= [];
	var mapping=null;
        var str = document.getElementById('q').value;
	var gg = document.getElementById('results-toggle').checked;
	console.log("toggle:"+gg);
	if (gg) {
		console.log("now true");
	}
	else {
		console.log('now false');
	}
	
	$.getJSON("http://localhost:4000/woordnl-rc/search/js/mapping-woordnl.json",
			function(data){
				mapping=data;
				
			});
        $.getJSON("http://localhost:4000/woordnl-rc/get_search_results?term="+str,
			function(data){
				jsonStr=data;
				count=jsonStr.ThemData.hits.total;
				count="<b>"+count+"</b>"
				//console.log("count!");
				//console.log(count);
				$("#resultq").html(count);
				$("#Themresults").html("");
				
				for (hit in jsonStr.ThemData.hits.hits)
				{
					//console.log("did it");
					
					file=jsonStr.ThemData.hits.hits[hit]._source.asr_file;
					var asrs=file.split("\.");
					//console.log(asrs[1]);
					file=asrs[1];
					title=mapping[file].titles[0].value;
					subtitle=mapping[file].titles[1].value;
					urn = mapping[file].urn;
					publish=mapping[file].publishStart;
					broadcast=mapping[file].broadcasters;
					duration=mapping[file].duration;
			
					html='  \
						<a href="http://rdlabs.beeldengeluid.nl/woordnl-rc/index_embed.html?urn='+urn+'">\
						<div class="result program" data-urn="'+urn+'"> \
						 \
						<div class="visualisation">\
						</div><span class="title">'+title+'\
						<span class="publishDate">'+publish+'</span>\
						</span><span class="subTitle">'+subtitle+'</span>\
						<div class="highlights"><span class="highlight"> Test <em class="hlt1">Highlight</em></span> \
						</div>\
						<div class="meta"><span class="duration">'+duration+'</span><span class="genres">Test Genre</span>\
						<span class="broadcasters"> \
						<span class="broadcaster">'+broadcast+'</span></span> </div></div></a> ';
					if (gg)
					{
						if ($.inArray(asrs[1], files)==-1)
							{
						files.push(asrs[1]);
						$("#Themresults").append(html);
						$("#resultq").html(files.length);
							}
					}
					else	{
						console.log("ggis OFFFF:"+gg);
						$("#Themresults").append(html);
						}
					
				}
				
				
		});
	
	}
	