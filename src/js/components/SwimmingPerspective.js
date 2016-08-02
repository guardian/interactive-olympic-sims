import {
    select,
    selectAll
} from 'd3-selection';
import {
	scaleLinear
} from 'd3-scale';
import {
	max as d3_max,
	min as d3_min,
	extent,
	sum as d3_sum,
	range
} from 'd3-array';
import {
	format as d3_format
} from 'd3-format';
import {
	line as d3_line
} from 'd3-shape';
import {
	transition
} from 'd3-transition';
import PerspT from 'perspective-transform';
import {
	getOffset,
	getPerspective
} from '../lib/dom';

import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import {
	convertTimeHMS,
	convertTime,
	formatSecondsMilliseconds,
	getDistance,
	getTimeForDistance
} from '../lib/time';

import {
	dimensions,
	DiveEasing,
	SwimmingLinear
} from '../lib/swimming'


import StopWatch from "./StopWatch";

export default function SwimmingLineChart(data,options) {

	//console.log("SwimmingLineChart",data.olympics.eventUnit.result.entrant);

	let swimmers_data=[],
		best_cumulative_times={},
		CURRENT_LEG=0,
		CURRENT_STEP=0,
		CURRENT_DISTANCE=0,
		GOLD_LANE,
		LEGS=[],
		WR;

	let multiplier=options.multiplier || 1;

	let stopWatch;
	let ts=[]; //timeouts for timing

	let container,
		overlay,
		perspectives=[],
		annotations_layer,
		svg,
		leg,
		athlete,
		marker,
		WIDTH,
		HEIGHT,
		xscale,
		yscale,
		line = d3_line();//.curve(curveMonotoneX)
	let swimming_pool;

	let frameRequest = requestAnimFrame(function checkInnerHTML(time) {
        //////console.log(time)
        
        if(options.container && options.container.getBoundingClientRect().height) {
            cancelAnimFrame(checkInnerHTML);
           	
			buildEvent();

            return; 
        }
        frameRequest = requestAnimFrame(checkInnerHTML);
    });

    function buildEvent() {
    	
    	

    	//swimmers_data=data.olympics.eventUnit.result.entrant.sort((a,b)=>(+a.order - +b.order)).map(entrant => {
    	swimmers_data=data.olympics.eventUnit.result.entrant.map(entrant => {

    		let REACTION_TIME,
	    		SPLITS,
	    		LEG_BREAKDOWN;

    		entrant.resultExtension.forEach((t,i)=>{
    			if(t.type==="Reaction Time") {
    				REACTION_TIME=i
    			}
    			if(t.type==="Split Times") {
    				SPLITS=i;
    			}
    			if(t.type==="Leg Breakdown") {
    				LEG_BREAKDOWN=i;
    			}
    		})
    		console.log(REACTION_TIME,SPLITS,LEG_BREAKDOWN)
    		let swimmer=options.team?entrant.country.identifier:entrant.participant.competitor.fullName;

    		let prev_cumulative_time=0;

    		if(!GOLD_LANE) {
    			GOLD_LANE=+entrant.order;
    		}

    		return {
    			"swimmer":swimmer,
    			"lane":+entrant.order,
    			"reaction_time":{
    				value: (typeof REACTION_TIME=='undefined') ? "DQF" : entrant.resultExtension[REACTION_TIME].value,
    				time: (typeof REACTION_TIME=='undefined') ? "DQF" : +entrant.resultExtension[REACTION_TIME].value*1000
    			},
    			"splits":entrant.resultExtension[SPLITS].extension.map((d,i)=>{
    				let cumulative_time=convertTime(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;



    				return {
    					value:d.value,
    					time:lap_time,
    					cumulative_time:cumulative_time,
    					distance:+d.position*dimensions.length,
			    		calculated:(d.mt%dimensions.length)?true:false,
			    		position:+d.position,
			    		name_country:entrant.participant.competitor.lastName+" "+entrant.country.identifier,
						country_name:entrant.country.identifier+" "+entrant.participant.competitor.lastName
    				}
    			}),
    			"entrant":entrant,
    			"value":(()=>{
    				if(typeof entrant.value != 'undefined') {
    					return entrant.value;
    				}
    				
    				return entrant.property.value;
    				
    			}()),
    			"records":(()=>{
    				let records=[];
    				if(typeof entrant.property.length !== 'undefined') {
    					records = entrant.property.filter(r=>r.type==="Record Set").map(r=>r.value)	
    				}
    				return records.indexOf("WR")>-1?records.filter(r=>(r==="WR")):records.filter(r=>(r==="OR"))
    				//return records.filter(r=>(r==="WR"));
    			}())
    		}
    	});

    	LEGS=range(swimmers_data[0].splits.length+1).map(d=>d*dimensions.length);
    	

    	swimmers_data.forEach(swimmer=>{
    		if(!best_cumulative_times[0]) {
				best_cumulative_times[0]={
					cumulative_times:[],
    				times:[]
				}
			}
			
			if(swimmer.reaction_time.time!=="DQF") {
				best_cumulative_times[0].times.push(swimmer.reaction_time.time)
				best_cumulative_times[0].cumulative_times.push(swimmer.reaction_time.time)
			}

    		swimmer.splits.forEach(split=>{
    			if(!best_cumulative_times[split.distance]) {
    				best_cumulative_times[split.distance]={
    					cumulative_times:[],
    					times:[]
    				}
    			}
    			if(split.time>0) {
    				best_cumulative_times[split.distance].times.push(split.time)
    			}

    			best_cumulative_times[split.distance].cumulative_times.push(split.cumulative_time)
    			
    		})
    	})
    	for(let distance in best_cumulative_times) {
    		best_cumulative_times[distance].best_time=d3_min(best_cumulative_times[distance].times);
    		best_cumulative_times[distance].best_cumulative=d3_min(best_cumulative_times[distance].cumulative_times);
    		best_cumulative_times[distance].times=best_cumulative_times[distance].times.sort((a,b)=>(a-b));
    		best_cumulative_times[distance].times=best_cumulative_times[distance].cumulative_times.sort((a,b)=>(a-b));
    	}
    	console.log(swimmers_data)
		console.log(best_cumulative_times)

		swimmers_data.forEach(s => {

			s.splits=([{
				value:s.reaction_time.value==="DQF" ? "DQF" : s.reaction_time.value,
				time:s.reaction_time.value==="DQF" ? best_cumulative_times[0].times[best_cumulative_times[0].times.length-1] : s.reaction_time.time,
				cumulative_time:s.reaction_time.value==="DQF" ? best_cumulative_times[0].times[best_cumulative_times[0].times.length-1] : s.reaction_time.time,
				distance:0
			}]).concat(s.splits);

			//s.splits=splits;


			s.splits.forEach(split => {

				let gap=split.cumulative_time-best_cumulative_times[split.distance].best_cumulative,
					text=(gap>0)?`+${formatSecondsMilliseconds(gap,2)}`:split.value;


				options.text.push({
					"type":"annotation",
					"time":true,
					"mt":split.distance,//(LEGS.length-1)*dimensions.length,
					"lane":s.lane,
					"text":split.distance===0?split.value:text,
					"records":split.distance===LEGS[LEGS.length-1]?s.records:[]
				})	

			});
			
		})

		console.log(options.text)

		buildVisual();

	}
	function buildVisual() {

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};


	    container=select(options.container)
	    					.append("div")
	    					.attr("class","swimming-perspective");



	    annotations_layer=container
								.append("div")
								.attr("class","annotations");



	    overlay=container
						.append("div")
						.attr("class","rio-overlay");

		
		

	    



	    let box = container.node().getBoundingClientRect();
	    WIDTH = box.width;
		HEIGHT = box.width>414?box.width:box.height;

	    svg=container.append("svg")
		    	.attr("width",WIDTH)
		    	.attr("height",HEIGHT)
		    	.each(function(){
		    		stopWatch=new StopWatch({
						container:options.container,
						svg:this,
						multiplier:multiplier
					});
		    	})



	    console.log(WIDTH,"x",HEIGHT)

	    

	    let time_extent=extent(LEGS.map(l=>{
	    	let leg_extent=extent(best_cumulative_times[l].cumulative_times);
	    	return leg_extent[1]-leg_extent[0];
	    }))

	    //console.log("TIME_EXTENT",time_extent)
	    

		xscale=scaleLinear().domain([0,(dimensions.lanes_n+1)*dimensions.lane]).range([0,WIDTH-(margins.left+margins.right)]);
		yscale=scaleLinear().domain([0,dimensions.length]).range([HEIGHT-(margins.top+margins.bottom),0]);
		
		overlay
			.style("top",margins.left+"px")
	    	.style("left",margins.top+"px")
	   		.style("width",xscale.range()[1]+"px")
	    	.style("height",yscale.range()[0]+"px")

	    let sqrtScale=scaleLinear().domain([800,1260]).range([350,800]);

	    let w=xscale.range()[1];
					
		buildTexts("intro");

		let pool={
			w:xscale(dimensions.lane*(dimensions.lanes_n+1)),
			h:yscale(0)
		};
		console.log("POOL",pool)		

		swimming_pool=new SwimmingPool({
									svg:svg,
									margins:margins,
									hscale:xscale,
									vscale:yscale,
									legs:LEGS
							})

	   	let lines=svg
					.append("g")
					.attr("class","swimmers")
					.attr("transform",`translate(${margins.left},${margins.top})`)

		let swimmer=lines
					.selectAll("g.swimmer")
					.data(swimmers_data)
					.enter()
					.append("g")
						.attr("class","swimmer")
						.classed("gold",d=>{
							let t=d.splits[d.splits.length-1];
							return best_cumulative_times[t.distance].cumulative_times.indexOf(t.cumulative_time)===0;
						})
						.classed("silver",d=>{
							let t=d.splits[d.splits.length-1];
							return best_cumulative_times[t.distance].cumulative_times.indexOf(t.cumulative_time)===1;
						})
						.classed("bronze",d=>{
							let t=d.splits[d.splits.length-1];
							return best_cumulative_times[t.distance].cumulative_times.indexOf(t.cumulative_time)===2;
						})

		leg=swimmer
					.selectAll("g.leg")
					.data(ath=>{

						//console.log("SWIMMER",ath)

						/*ath.splits=([{
							value:ath.reaction_time.value,
							time:ath.reaction_time.time,
							cumulative_time:ath.reaction_time.time,
							distance:0
						}]).concat(ath.splits);*/
						

						return ath.splits.map(d=>{

							let distance=d.distance || 3.5;
							d.mt=distance*best_cumulative_times[d.distance].best_cumulative/d.cumulative_time;
							d.dmt=distance-d.mt;
							d.lane=ath.lane;
							
							return d;
						});
					})
					.enter()
					.append("g")
						.attr("class",d=>("leg m"+d.distance));



		leg.append("path")
				.attr("id",s=>"leg_"+s.lane+"_"+s.distance)
				.attr("d",s=>{

					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						start_y=(s.distance%(dimensions.length*2)>0)?yscale(0):yscale(dimensions.length),
						y=(s.distance%(dimensions.length*2)>0)?yscale(dimensions.length):yscale(0);

					return line([
								[x,start_y],
								[x,y],
								[x,start_y]
							]);


				})
				.attr("stroke-width",Math.floor(xscale(dimensions.lane*0.5)))

		

		leg.filter(s=>(s.distance===0))
				.append("path")
				.attr("id",(s)=>("guide_"+s.lane+"_"+s.distance))
				.attr("class","guide-text-path")
				.attr("d", (s) => {
					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						y0=yscale(s.mt),
						y1=yscale(50);
					return `M${x},${y0}L${x},${y1}`;
				});


		leg.filter(s=>(s.distance===0))
			.selectAll("text")
			.data(s=>(WIDTH<400?[s]:[s,s]))
			.enter()
			.append("text")
				.attr("class","swimmer-name")
				.classed("stroke",(s,i)=>(i<1 && WIDTH>400))

		leg.filter(s=>(s.distance===0))
				//.selectAll("text:not(.stroke)")
				.selectAll("text")
					.attr("dx",5)
				    .attr("dy","0.35em")
					.append("textPath")
				    	.attr("xlink:href", (s,i)=>{
				    		return `#guide_${s.lane}_${s.distance}`
				    	})
				    	.attr("text-anchor","start")
				    	.attr("startOffset","0%")
				    	.text((s,i)=>{
							let swimmer=swimmers_data.filter(d=>(d.lane===s.lane))[0];

							if(options.team) {
								return swimmer.entrant.country.identifier;
							}

							//console.log("TEXTPATH",s)

							return swimmer.entrant.participant.competitor.lastName+" "+swimmer.entrant.country.identifier
						})

		leg.filter(s=>(s.distance>0))
			.selectAll("text")
			.data(s=>(WIDTH<400?[s]:[s,s]))
			.enter()
			.append("text")
				.attr("class","swimmer-name")
				.classed("stroke",(s,i)=>(i<1 && WIDTH>400))

		leg.filter(s=>(s.distance>0))
				.selectAll("text")
					.attr("dx",s=>{
				    	return (s.distance%100===0)?5:-5
				    })
				    .attr("dy",s=>{
				    	return (s.distance%100===0)?"0.35em":"0.35em"   //9:6
				    })
				  	.append("textPath")
				    	.attr("xlink:href", s=>("#leg_"+s.lane+"_"+s.distance))
				    	.attr("text-anchor",s=>(s.distance%100>0)?"end":"start")
				    	.attr("startOffset",s=>(s.distance%100>0)?"50%":"50%")
				    	.text(s=>{
							let swimmer=swimmers_data.filter(d=>(d.lane===s.lane))[0]
							if(options.team) {
								return swimmer.entrant.country.identifier;
							}
							return swimmer.entrant.participant.competitor.lastName+" "+swimmer.entrant.country.identifier
						})

		goTo(options.text[0].mt,options.text[0].story==="intro")

		
	}

	function buildTexts(type) {
		
		console.log("buildTexts",CURRENT_STEP)

		

		let texts=options.text.filter(d=>d.type===(type || "story"));

		console.log("TEXTS",texts,texts[CURRENT_STEP])
		
		let standfirst=select(options.container)
							.selectAll("div.stand-first")
								.data([texts[CURRENT_STEP]]);

		standfirst=standfirst
			.enter()
		    .append("div")
		    .attr("class","stand-first")
			.merge(standfirst)
    			.html(d=>{
    				//console.log("!!!!",d)
    				return "<p>"+d.text+"</p>";
    			});

		
		let button=standfirst
						.selectAll("button")
		    				.data([texts[CURRENT_STEP].button]);

	    button
	    	.enter()
	    	.append("button")
		    	.on("click",()=>{
					CURRENT_STEP=(CURRENT_STEP+1)%texts.length;
					console.log(CURRENT_STEP,texts[CURRENT_STEP].mt)
					//CURRENT_STEP=CURRENT_STEP===0?1:CURRENT_STEP;
					buildTexts();
					//deactivateButton();
					if(texts[CURRENT_STEP].type!=="intro") {
						swimming_pool.setAxis(texts[CURRENT_STEP].mt)
					} else {
						swimming_pool.setAxis(0)
					}
					goTo(options.text.filter(d=>d.type==="story")[CURRENT_STEP].mt,(d)=>{
						activateButton();
					})
				})
			.merge(button)
				.classed("replay",d=>(d.toLowerCase()==="replay"))
				.text(d=>d)

	}

	function deactivateButton() {
		//alert("de-activate")
		select(options.container)
			.select("div.stand-first")
				.select("button")
					.classed("inactive",true)
					//.attr("disabled","disabled")
	}

	function activateButton() {
		//alert("activate")
		select(options.container)
			.select("div.stand-first")
				.select("button")
					.classed("inactive",false)
					//.attr("disabled","false")
	}

	function removeAnnotations() {
		annotations_layer.selectAll("div.annotation").remove();
	}
	
	function addAnnotation() {
		console.log("addAnnotation",CURRENT_DISTANCE)

		let annotations=options.text.filter(d=>(d.mt===CURRENT_DISTANCE && d.type==="annotation" && !d.time));

		let annotation=annotations_layer.selectAll("div.annotation").data(annotations);

		console.log("ANNOTATIONS",annotations)

		let xy;
		let offset=getOffset(annotations_layer.node());
		annotation
			.enter()
			.append("div")
				.attr("class","annotation")
			.merge(annotation)
				.classed("side0",d=>(d.mt%(dimensions.length*2)===0))
				.classed("side1",d=>(d.mt%(dimensions.length*2)>0))
				.classed("time",d=>d.time)
				.style("left",d=>{
					
					let x=xscale(d.lane*dimensions.lane + dimensions.lane/2),
						y=(d.mt%(dimensions.length*2)>0)?yscale(dimensions.length):yscale(0);

					let side=(d.mt%(dimensions.length*2)>0)?1:0;
						
					let overlayPersp=computePerspective(side);
					d.coords=overlayPersp.transform(x,y)
					xy=[x,y];
					/*console.log("COORDS",d.coords)

					
					console.log("OFFSET",offset)

					console.log("LEFT",(d.coords[0]-offset.left))*/

					return (d.coords[0]-offset.left)+"px";
				})
				.style("top",d=>{
					//let offset=getOffset(annotations_layer.node());
					//console.log("OFFSET",offset,getOffset(this))
					//offset.top=0;
					//console.log("TOP",(d.coords[1]-(offset.top)))
					let dy=(d.mt%(dimensions.length*2)>0)?-24:18;
					return (d.coords[1]-(offset.top)+dy)+"px";
				})
				.html(d=>"<span>"+d.text+"</span>")

		

	}

	function removeGaps() {
		svg.selectAll("path").interrupt();
		svg.selectAll("path.gap").remove();
	}
	function showGap(el,s,best_time) {
		//console.log("showGap",el,s);

		//console.log("DURATION",s.cumulative_time-best_time)

		el
			.append("path")
				.attr("class","gap")
				.attr("d",()=>{

					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						side=s.distance%(dimensions.length*2),
						start_y=(side>0)?yscale(side-s.dmt):yscale(s.dmt),
						y=yscale(side);
					
					//console.log("GAP PATH",s.lane,s.distance,s.mt,start_y,y)
					
					return line([
								[x,start_y],
								[x,start_y]
							]);

				})
				.attr("stroke-width",Math.floor(xscale(dimensions.lane*0.5)))
				.transition()
				.duration(s.cumulative_time-best_time)
				.ease(SwimmingLinear)
						.attr("d",()=>{

							let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
								side=s.distance%(dimensions.length*2),
								start_y=(side>0)?yscale(side-s.dmt):yscale(s.dmt),
								y=yscale(side);
							//console.log("GAP PATH",s.lane,s.distance,s.mt,start_y,y)
							return line([
										[x,start_y],
										[x,y]
									]);

						})

	}
	function addTime(distance,lane) {
		//console.log("addTime",distance,lane)

		let annotations=options.text.filter(d=>(d.mt===distance && d.lane===lane && d.type==="annotation" && d.time))[0];

		let annotation=annotations_layer.selectAll("div.annotation");//.data(annotations,d=>("time_"+distance+"lane"));

		//console.log("ANNOTATIONS",annotations)

		

		let xy;
		let offset=getOffset(annotations_layer.node());

		annotations_layer
			//.enter()
			.append("div")
				.datum(annotations)
				.attr("class","annotation time")
			//.merge(annotation)
				.classed("side0",d=>(d.mt%(dimensions.length*2)===0))
				.classed("side1",d=>(d.mt%(dimensions.length*2)>0))
				.classed("time",d=>d.time)
				.style("left",d=>{
					
					let x=xscale(d.lane*dimensions.lane + dimensions.lane/2),
						y=(d.mt%(dimensions.length*2)>0)?yscale(dimensions.length):yscale(0);

					let side=(d.mt%(dimensions.length*2)>0)?1:0;
						
					let overlayPersp=computePerspective(side);
					d.coords=overlayPersp.transform(x,y)
					xy=[x,y];

					

					return (d.coords[0]-offset.left)+"px";
				})
				.style("top",d=>{
					//let offset=getOffset(annotations_layer.node());
					return (d.coords[1]-(offset.top))+"px";
				})
				.html(d=>{
					let b="";
					if(d.records.length) {
						b=` ${d.records.join(",")}`;
					}
					return `<span>${d.text}${b}</span>`;
				})
				.select("span")
					.style("margin-left",function(d){
						let coords=this.getBoundingClientRect();
						//console.log(coords)
						return (-coords.width/2)+"px";
					})


	}

	this.goTo = (distance) => {
		goTo(distance);
	}
	
	function goTo(distance,text_update) {

		ts.forEach(t=>{
			clearTimeout(t);
			t=null;
		});

		removeAnnotations();
		removeGaps();
		stopWatch.hide();

		CURRENT_DISTANCE=distance;
		
		if(distance%(dimensions.length*2)>0) {
			//50m side


			let transform=`rotateX(65deg) rotateY(0deg) rotateZ(10deg) translateX(-1%) translateY(${300}px) translateZ(150px)`;
			if(WIDTH<400) {
				//container.style("perspective","700px").style("perspective-origin","90% 20%")
				transform="rotateX(75deg) rotateY(0deg) rotateZ(10deg) translateX(67px) translateY(365px) translateZ(45px) scale(0.8)";
			}
			try {
		    	svg
		    		.style("-webkit-transform",transform)
		    		.style("-moz-transform",transform)
		    		.style("-ms-transform",transform)
		    		.style("transform",transform);

		    	overlay
		    		.style("-webkit-transform",transform)
		    		.style("-moz-transform",transform)
		    		.style("-ms-transform",transform)
		    		.style("transform",transform);
		    } catch(e) {

			}
	    } else {
	    	//0m side


	    	let dyScale=scaleLinear().domain([800,1260]).range([350,800]);
			let w=xscale.range()[1],
				dy=-dyScale(w);
			let transform=`rotateX(65deg) rotateY(0deg) rotateZ(10deg) translateX(-1%) translateY(${dy}px) translateZ(150px)`;
			  		    	
			if(WIDTH<400) {
				//container.style("perspective","700px").style("perspective-origin","90% 20%")
				transform=`rotateX(70deg) rotateY(0deg) rotateZ(10deg) translateX(80px) translateY(50px) translateZ(30px) scale(0.8)`;
			}

			try {
				svg
		    		.style("-webkit-transform",transform)
		    		.style("-moz-transform",transform)
		    		.style("-ms-transform",transform)
		    		.style("transform",transform);
		    		
		    	overlay
		    		.style("-webkit-transform",transform)
		    		.style("-moz-transform",transform)
		    		.style("-ms-transform",transform)
		    		.style("transform",transform);	
			} catch(e) {

			}
	    	
	    }

		let delta=10;

		let selected_leg=leg
			.classed("visible",false)
			.interrupt()
			.filter(d=>(d.distance===distance))
				.classed("visible",true);		

		if(!options.team) {
			selected_leg
				.selectAll("textPath")
				.filter(s=>s.distance>0)
				.text(s=>{
					//console.log("TEXTPATH",s)
					let name=(s.distance%(dimensions.length*2)>0) ?
								s.country_name
								:
								s.name_country
					
					return name;
				})
		}

		selected_leg
				.select("path")
					.attr("d",s=>{

						let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
							start_y=(s.distance%(dimensions.length*2)>0)?yscale(0):yscale(dimensions.length),
							dist=s.distance-s.mt,
							y=(s.distance%(dimensions.length*2)>0)?yscale(dimensions.length-dist-delta):yscale(dist+delta);


						if(s.distance===0) {
							start_y=yscale(0);
							y=start_y;
						}

						s.text_start_y=y;
						return line([
									[x,start_y],
									[x,y],
									[x,start_y]
								]);

					})
					.transition()
					.duration(s=>{
						if(s.distance===0) {
							return best_cumulative_times[s.distance].best_time;
						}
						return getTimeForDistance(best_cumulative_times[s.distance].best_time,dimensions.length,delta)
						//return best_cumulative_times[s.distance].best_time*0.2*0.5
					})
					.delay(1000)
					.ease(SwimmingLinear)
						.attr("d",s=>{

							let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
								start_y=(s.distance%(dimensions.length*2)>0)?yscale(0):yscale(dimensions.length),
								dist=s.distance-s.mt,
								y=(s.distance%(dimensions.length*2)>0)?yscale(dimensions.length-dist-0):yscale(dist+0);


							if(s.distance===0) {
								start_y=yscale(0);
								y=yscale(s.mt);
							}

							return line([
										[x,start_y],
										[x,y],
										[x,start_y]
									]);

						})
						.on("start",d=>{

							ts.forEach(t=>{
								clearTimeout(t);
								t=null;
							});

							if(d.lane===GOLD_LANE) {

								if(d.distance>0) {
									let position=d.position-1,
										record=options.record.split_times[position];
									let trecord=convertTime(record);
									stopWatch.showRecord(options.record.split_times[d.position-1],false,position<LEGS.length-2)	
								} else {
									stopWatch.hideRecord();
								}

								let duration=best_cumulative_times[d.distance].best_time*(delta/dimensions.length)*multiplier;
								if(d.calculated) {
									stopWatch.hide();
								} else {
									stopWatch.start(best_cumulative_times[d.distance].best_cumulative-duration,false);	
								}
								
							}
						})
						.on("end",function(d){
							if(d.lane===GOLD_LANE) {
								if(text_update){
									buildTexts();
									addAnnotation();
								}
								if(d.distance>0) {
									//console.log("!!!!!!!",d)
									let position=d.position-1,//LEGS.indexOf(+d.distance),
										record=options.record.split_times[position];
									//console.log(position,options.record.split_times)
									let trecord=convertTime(record),
										gap=best_cumulative_times[d.distance].best_cumulative-trecord;
									//console.log("!!!!!!!!",record,trecord,gap,formatSecondsMilliseconds(gap))	
									stopWatch.showRecord(options.record.split_times[d.position-1],gap,position<LEGS.length-2)	
								} else {
									stopWatch.hideRecord();
								}
								
							}

							if(d.distance>0) {
								showGap(select(this.parentNode),d,best_cumulative_times[d.distance].best_cumulative);
							}

							if(d.cumulative_time===best_cumulative_times[d.distance].best_cumulative) {
								stopWatch.stop(d.cumulative_time);
							}

							let delay=d.cumulative_time-best_cumulative_times[d.distance].best_cumulative;



							ts.push(
								setTimeout(()=>{
									let entrant=swimmers_data.filter(a=>a.lane===d.lane)[0],
										gap=d.cumulative_time-best_cumulative_times[d.distance].best_cumulative;

									addTime(d.distance,d.lane);
								},delay)
							);
						})
						.filter((d)=>(d.lane===GOLD_LANE))
							.attrTween("nothing",(s)=>{
								return function(t) {
									//console.log(Math.round(t*1000/10)*10)
									stopWatch.update();
									//stopWatch.setTime(Math.round(t*1000/10)*10)
									return "";
								}
							})
		

		
		

	}

	this.getPosition = (lane,distance) => {
		return getPosition(lane,distance);
	}

	function getPosition(lane,distance) {

		let x=xscale(lane*dimensions.lane + dimensions.lane/2),
			y=(distance%(dimensions.length*2)>0)?yscale(dimensions.length):yscale(0);

		console.log("POSITION",lane,distance,"->",x,y)

		return [x,y];

	}

	function computePerspective(side) {

		if(perspectives[side]) {
			//ideally saving the perspective to avoid recalculating it everytime
			//but apparently doesn't cope well with scrollTop
			//return perspectives[side]; 
		}

		let coords=[
			[xscale.range()[0],yscale.range()[0]],
			[xscale.range()[1],yscale.range()[0]],
			[xscale.range()[1],yscale.range()[1]],
			[xscale.range()[0],yscale.range()[1]]
		]

		let srcPts=[],
			dstPts=[];

		let point=overlay
						.selectAll("div.overlay-point")
						.data(coords);
		point
			.enter()
				.append("div")
				.attr("class","overlay-point")
			.merge(point)
				.style("left",d=>(d[0]+"px"))
				.style("top",d=>(d[1]+"px"))
				.each(function(d){
					srcPts.push(d[0]);
					srcPts.push(d[1]);

					let coords=this.getBoundingClientRect();
					//console.log("CSS3 coords",coords)
					dstPts.push(coords.left);
					dstPts.push(coords.top);
				});

		

		perspectives[side] = PerspT(srcPts, dstPts);

		return perspectives[side];
	}

	

}
function SwimmingPool(options) {

		////console.log("SwimmingPool",options)

		let hscale=options.hscale,
			vscale=options.vscale;

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};

	   	let pool=options.svg
					.append("g")
					.attr("class","swimming-pool")
					.attr("transform",`translate(${margins.left},${margins.top})`)
		

		let pool_coords=[]


		pool
			.append("g")
				.attr("class","water")
					.append("path")
						.attr("d",()=>{
							let points=[
								[hscale(0),vscale(0)],
								[hscale(dimensions.lane*(dimensions.lanes_n+1)),vscale(0)],
								[hscale(dimensions.lane*(dimensions.lanes_n+1)),vscale(dimensions.length)],
								[hscale(0),vscale(dimensions.length)]
							];
							return d3_line()(points.map(p=>{
								return [p[0],p[1]]
							}))
						})

		let lanes=[
				{
					lanes:range(dimensions.lanes_n).map(d=>{
							return [[hscale(dimensions.lane*(d+1)),vscale.range()[0]],[hscale(dimensions.lane*(d+1)),vscale(5)]]
					}),
					colors:range(dimensions.lanes_n).map(d=>"r")

				},
				{
					lanes:range(dimensions.lanes_n).map(d=>{
							return [[hscale(dimensions.lane*(d+1)),vscale(dimensions.length-5)],[hscale(dimensions.lane*(d+1)),vscale(dimensions.length)]]
					}),
					colors:range(dimensions.lanes_n).map(d=>"r")
				},
				{
					lanes:range(dimensions.lanes_n).map(d=>{
						return [[hscale(dimensions.lane*(d+1)),vscale(dimensions.length-5)],[hscale(dimensions.lane*(d+1)),vscale(5)]]
					}),
					colors:["g","bl","bl","y","y","y","bl","bl","g"]
				}
				
		];
		console.log("LANES",lanes)
		pool
			.selectAll("path.lane-ropes")
			.data(lanes)
			.enter()
				.append("g")
					.attr("class","lane-ropes")
					.selectAll("path.lane-rope")
						.data(d=>{ 
							return d.lanes.map((l,i)=>{
								//console.log("L",l,i,d)
								return	{
											rope:l,
											color:d.colors[i]	
										}
								});
						})
						.enter()
						.append("path")
							.attr("class",d=>("lane-rope "+d.color))
							.style("fill","none")
							.attr("d",d=>{
								//console.log("rope",d.rope)
								return d3_line()(d.rope.map(p=>{
									return [p[0],p[1]]
								}))
							})


		pool.append("text")
				.attr("id","label_side1")
				.attr("class","axis")
				.attr("x",hscale((dimensions.lanes_n)*dimensions.lane+dimensions.lane/2))
				.attr("y",vscale(50))
				.attr("dy","1em")
				.attr("dx",hscale(0.1))
				.text("50m")

		pool.append("text")
				.attr("id","label_side0")
				.attr("class","axis")
				.attr("x",hscale((dimensions.lanes_n)*dimensions.lane+dimensions.lane/2))
				.attr("y",vscale(0))
				.attr("dx",hscale(0.1))
				.attr("dy",-5)
				.text(((options.legs.length-1)*dimensions.length)+"m")
		
		this.setAxis = (distance) => {
			//alert(distance+" "+(`#label_side${+(distance%(dimensions.length*2)>0)}`))
			pool.select(`#label_side${+(distance%(dimensions.length*2)>0)}`)
				.text(distance+"m")

		}
}
