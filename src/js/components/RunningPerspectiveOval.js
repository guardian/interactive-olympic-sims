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
import {
	interpolateString
} from 'd3-interpolate';

import Oval from './Oval';

import {strokeShadow} from '../lib/CSSUtils';

//import Barchart from './Barchart';
import PerspT from 'perspective-transform';
import {getOffset} from '../lib/dom';

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
	RunningLinear,
	Running200mEasing
} from '../lib/running'

import StopWatch from "./StopWatch";

//import Velodrome from './Velodrome';

export default function RunningPerspectiveOval(data,options) {

	//console.log("SwimmingLineChart",data.olympics.eventUnit.result.entrant);

	let athletes_data=[],
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

	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

	let LANE_RATIOS=[];

	let container,
		overlay,
		oval,
		WIDTH,
		HEIGHT,
		perspectives=[],
		annotations_layer,
		svg,
		leg,
		athlete,
		photofinish,
		marker,
		xscale,
		yscale,
		line = d3_line();//.curve(curveMonotoneX)
	let track;

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
    	
    	let REACTION_TIME=0,
    		SPLITS=1;

    	for(var k in options.dimensions) {
    		//console.log("setting",k,dimensions[k],"to",options.dimensions[k])
	    	dimensions[k]=options.dimensions[k];
    	}



    	//console.log(data.olympics.eventUnit.result)


		


    	athletes_data=data.olympics.eventUnit.result.entrant.map(entrant => {
 
    		let athlete=options.team?entrant.country.identifier:entrant.participant.competitor.fullName;

			let prev_cumulative_time=0;

			if(!GOLD_LANE) {
				GOLD_LANE=+entrant.order;
			}


    		return {
    			"athlete":athlete,
    			"lane":(+entrant.order-1),
    			"reaction_time":{
    				value: (typeof REACTION_TIME=='undefined') ? "DQF" : entrant.resultExtension[REACTION_TIME].value,
    				time: (typeof REACTION_TIME=='undefined') ? "DQF" : +entrant.resultExtension[REACTION_TIME].value*1000
    			},
    			"splits":(function(){
    				if(!options.text) {
    					return [
    						{
		    					value:entrant.value,
			    				time:convertTime(entrant.value),
			    				cumulative_time:convertTime(entrant.value),
			    				distance:dimensions.length
			    			}
    					]
    				}
    				let prev_time=0;
    				return options.text.filter(d=>(d.mt>0 && d.state==="story" && !d.photofinish)).map((d,i)=>{
    					let time=convertTime(entrant.value)*(d.mt / dimensions.length);
    					//console.log("TIME TIME TIME",entrant.value,convertTime(entrant.value),d.mt,"/",dimensions.length,"=",d.mt / dimensions.length)
    					if(dimensions.fixes[d.mt]) {
    						time=convertTime(dimensions.fixes[d.mt][(+entrant.order-1)]);
    					}
    					let leg={
		    					value:entrant.value,
			    				time:time-prev_time,
			    				cumulative_time:time,
			    				distance:d.mt,
			    				position:i,
			    				calculated:(d.mt%dimensions.length)?true:false
			    			};
			    		prev_time+=time;
			    		return leg;
    					
    				})
    			}()),
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

    	//LEGS=range(athletes_data[0].splits.length+1).map(d=>d*dimensions.length);
    	LEGS=options.text.filter(d=>(d.state==="story" && !d.photofinish)).map(d=>d.mt)
    	

    	athletes_data.forEach(athlete=>{
    		if(!best_cumulative_times[0]) {
				best_cumulative_times[0]={
					cumulative_times:[],
    				times:[]
				}
			}

			if(athlete.reaction_time.time!=="DQF") {
				best_cumulative_times[0].times.push(athlete.reaction_time.time)
				best_cumulative_times[0].cumulative_times.push(athlete.reaction_time.time)
			}

			

    		athlete.splits.forEach(split=>{
    			if(!best_cumulative_times[split.distance]) {
    				best_cumulative_times[split.distance]={
    					cumulative_times:[],
    					times:[]
    				}
    			}
    			best_cumulative_times[split.distance].times.push(split.time)
    			best_cumulative_times[split.distance].cumulative_times.push(split.cumulative_time)
    		})
    	})
    	for(let distance in best_cumulative_times) {
    		best_cumulative_times[distance].best_time=d3_min(best_cumulative_times[distance].times);
    		best_cumulative_times[distance].best_cumulative=d3_min(best_cumulative_times[distance].cumulative_times);
    		best_cumulative_times[distance].times=best_cumulative_times[distance].times.sort((a,b)=>(a-b));
    		best_cumulative_times[distance].times=best_cumulative_times[distance].cumulative_times.sort((a,b)=>(a-b));
    	}
    	console.log(athletes_data)
		console.log(best_cumulative_times)

		athletes_data.forEach(s => {

			s.splits=([{
				value:s.reaction_time.value==="DQF" ? "DQF" : s.reaction_time.value,
				time:s.reaction_time.value==="DQF" ? best_cumulative_times[0].times[best_cumulative_times[0].times.length-1] : s.reaction_time.time,
				cumulative_time:s.reaction_time.value==="DQF" ? best_cumulative_times[0].times[best_cumulative_times[0].times.length-1] : s.reaction_time.time,
				distance:0
			}]).concat(s.splits);


			s.splits.forEach(split => {

				let gap=split.cumulative_time-best_cumulative_times[split.distance].best_cumulative,
					text=(gap>0)?`+${formatSecondsMilliseconds(gap,2)}`:split.value;


				options.text.push({
					"state":"annotation",
					"time":true,
					"mt":split.distance,//(LEGS.length-1)*dimensions.length,
					"lane":s.lane,
					"description":split.distance===0?split.value:text
				})	

			});
			
		})

		buildVisual();

	}

	

	function buildVisual() {

		

		//let ul=select(options.container).append("ul");
    	
		

		

		

	    container=select(options.container)
	    					.append("div")
	    					.attr("class","running-perspective-oval oval");

	    select(options.container)
	    		.append("div")
	    		.attr("class","notes")
	    		.html("The positions are based on the athletes' average speed.")

	    annotations_layer=container
								.append("div")
								.attr("class","annotations");

	    

		/*stopWatch=new StopWatch({
			container:options.container,
			multiplier:multiplier
		});*/

	    svg=container.append("svg")
	    
	    overlay=container
						.append("div")
						.attr("class","rio-overlay");

	    /*let box = container.node().getBoundingClientRect();
	    WIDTH = box.width;
		HEIGHT = box.width>414?box.width*3:box.height;*/

		let box = container.node().getBoundingClientRect();
		WIDTH = options.width || box.width*4,
        HEIGHT = options.height || box.height;

        HEIGHT = box.width>480?box.height:box.height*2;

	    let ratio=(84.39+36.5*2)/73.5;

	    HEIGHT=WIDTH/ratio;

	    // if(box.width<=480) {
	    // 	HEIGHT=568;
	    // 	WIDTH=HEIGHT*ratio;
	    // }

	    svg
	    	.attr("width",WIDTH)
	    	.attr("height",HEIGHT)
    		.each(function(){
	    		stopWatch=new StopWatch({
					container:options.container,
					svg:this,
					multiplier:multiplier
				});
	    	})

    	xscale=scaleLinear().domain([0,dimensions.radius*2+dimensions.field.width]).range([0,WIDTH-(margins.left+margins.left)]),
		yscale=scaleLinear().domain([0,dimensions.lanes*2+dimensions.field.height]).range([0,HEIGHT-(margins.top+margins.bottom)]);

		//xscale=yscale.copy();
	    //console.log(WIDTH,"x",HEIGHT)
	    
	    oval=new Oval({
	    		container:container.node(),
            	race:options.race,
				svg:svg,
				width:WIDTH,
				height:HEIGHT,
				scale:{
					x:xscale,
					y:yscale
				},
				margins:options.margins || {
					top:0,
					bottom:0,
					left:0,
					right:0
				},
				multiplier:multiplier,
				hundred:100
			})

	    //console.log(athletes_data)
	    athletes_data.forEach(d=>{
	    	oval.addRunner(d);
	    })

	    LANE_RATIOS=oval.getRatios();


	    
		

	    /*athletes_data.forEach(d=>{
	    	let info={
	    		leg_time:2000,
	    		leg:0
	    	};
	    	oval.updateRunner(d,info);
	    })*/
	    
	    //console.log(LEGS);
	    

		//xscale=scaleLinear().domain([0,(dimensions.lanes_n+1)*dimensions.lane]).range([0,WIDTH-(margins.left+margins.right)]);
		//yscale=scaleLinear().domain([0,dimensions.length]).range([0,HEIGHT-(margins.top+margins.bottom)]);
		
		

		overlay
			.style("top",margins.left+"px")
	    	.style("left",margins.top+"px")
	   		.style("width",xscale.range()[1]+"px")
	    	.style("height",yscale.range()[1]+"px")

		//computePerspective();
					
		buildTexts("intro");
		
		/*track=new Track({
			svg:svg,
			margins:margins,
			hscale:xscale,
			vscale:yscale,
			//perspT:perspT,
			legs:LEGS
		})*/

	   	let lines=svg
					.append("g")
					.attr("class","athletes")
					.attr("transform",`translate(${margins.left},${margins.top})`)

		let athlete=lines
					.selectAll("g.athlete")
					.data(athletes_data)
					.enter()
					.append("g")
						.attr("class","athlete")
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

		leg=athlete
					.selectAll("g.leg")
					.data(ath=>{

						//console.log("athlete",ath,best_cumulative_times)

						return ath.splits.map(d=>{

							let distance=d.distance || 5;
							d.mt=distance*best_cumulative_times[d.distance].best_cumulative/d.cumulative_time;
							d.dmt=distance-d.mt;
							d.lane=ath.lane;
							if(d.distance===0) {
								//console.log(d)
							}
							return d;
						});
					})
					.enter()
					.append("g")
						.attr("class",d=>("leg m"+d.distance));

		leg.append("path")
				.attr("id",s=>"leg_"+s.lane+"_"+s.distance)
				.attr("d",s=>{
					return oval.getPath(s.lane,true);
				})
				.attr("stroke-width",yscale(dimensions.lane-dimensions.line_width*2)*0.8)
	
		

		leg.filter(s=>(s.distance===0))
			.selectAll("text")
			.data(s=>(WIDTH<400?[s]:[s,s]))
			.enter()
			.append("text")
				.attr("class","athlete-name")
				.classed("stroke",(s,i)=>(i<1 && WIDTH>400))

		leg.filter(s=>(s.distance===0))
				//.selectAll("text:not(.stroke)")
				.selectAll("text")
					.attr("dx",15)
				    .attr("dy","0.35em")
					.append("textPath")
				    	.attr("xlink:href", (s,i)=>{
				    		return `#bg_o_${s.lane+1}`;
				    	})
				    	.attr("text-anchor","start")
				    	.attr("startOffset",d=>{
				    		if(d.distance===0) {
				    			let v=(200-dimensions.lane_staggers[d.lane]*LANE_RATIOS[d.lane])/(dimensions.length*2);
				    			return (v*100)+"%";
				    		}
				    		return "100%";
				    	})
				    	/*.attr("startOffset",s=>{
				    		
				    		let d=(dimensions.lane_staggers[s.lane]*0.88)/400;
				    		
				    		//console.log(s.lane,dimensions.lane_staggers,dimensions,(50 - d*100) + "%")
				    		
				    		return (0.5 - d)*100 + "%";
				    	})*/
				    	.text((s,i)=>{
							let athlete=athletes_data.filter(d=>(d.lane===s.lane))[0];

							if(options.team) {
								return athlete.entrant.country.identifier;
							}

							//console.log("TEXTPATH",s)

							return athlete.entrant.participant.competitor.lastName+" "+athlete.entrant.country.identifier
						})

		leg.filter(s=>(s.distance>0))
			.selectAll("text")
			.data(s=>(WIDTH<400?[s]:[s,s]))
			.enter()
			.append("text")
				.attr("class","athlete-name")
				.classed("stroke",(s,i)=>(i<1 && WIDTH>400))

		leg.filter(s=>(s.distance%dimensions.length===0))
			.selectAll("text.athlete-time")
			.data(s=>(WIDTH<400?[s]:[s,s]))
			.enter()
			.append("text")
				.attr("class","athlete-time")
				.classed("stroke",(s,i)=>(i<1 && WIDTH>400))
				.classed("hidden",true)

		

		leg.filter(s=>(s.distance>0))
				.selectAll("text.athlete-name")
					.attr("dx",s=>{
						return 10;
				    })
				    .attr("dy",s=>{
				    	return (s.distance%100===0)?"0.35em":"0.35em"   //9:6
				    })
				  	.append("textPath")
				    	//.attr("xlink:href", s=>("#leg_"+s.lane+"_"+s.distance))
				    	.attr("xlink:href", (s,i)=>{
				    		return `#bg_${s.lane+1}`;
				    	})
				    	.attr("text-anchor","start")
				    	//.attr("startOffset",s=>(s.distance>0)?"100%":"0%")
				    	.text(s=>{
							let athlete=athletes_data.filter(d=>(d.lane===s.lane))[0]
							if(options.team) {
								return athlete.entrant.country.identifier;
							}
							return athlete.entrant.participant.competitor.lastName+" "+athlete.entrant.country.identifier
						})
		
		leg.filter(s=>(s.distance%dimensions.length===0))
				.selectAll("text.athlete-time")
					.attr("dx",s=>{
						
				    	return (s.distance%100===0)?-5:-5
				    })
				    .attr("dy","0.35em")
				  	.append("textPath")
				    	//.attr("xlink:href", s=>("#leg_"+s.lane+"_"+s.distance))
				    	 .attr("xlink:href", (s,i)=>{
				    	 	if(s.distance===0) {
				    	 		return `#bg_o_${s.lane+1}`;
				    	 	}
				    	 	return "#leg_"+s.lane+"_"+s.distance;
				    	 })
				    	.attr("text-anchor",s=>s.distance===0?"end":"end")
				    	.attr("startOffset",d=>{
				    		if(d.distance===0) {



				    			//return (staggers_perc[d.lane]-(((d.mt*LANE_RATIOS[d.lane])/400)*100))+"%";
				    			let v=(200-dimensions.lane_staggers[d.lane]*LANE_RATIOS[d.lane]-d.mt*LANE_RATIOS[d.lane])/(dimensions.length*2);
				    			return (v*100)+"%";
				    		}
				    		return "100%";
				    		return ((d.mt/dimensions.length)*100)+"%"
				    	})
				    	//.attr("startOffset",s=>(s.distance>0)?"100%":"0%")
				    	.text(s=>{
							let athlete=athletes_data.filter(d=>(d.lane===s.lane))[0]

							if(s.distance===0) {
								return athlete.reaction_time.value;
							}

							return athlete.value;
						})

		photofinish=svg
					.append("g")
					.attr("class","photo-finish")
					.attr("transform",`translate(${margins.left},${margins.top})`)

		let l=best_cumulative_times[dimensions.length].cumulative_times.length,
			best=best_cumulative_times[dimensions.length].cumulative_times[0],
			worst=best_cumulative_times[dimensions.length].cumulative_times[l-1],
			photofinish_axis=range(
								Math.floor(best/100)*100-100,
								Math.ceil(worst/100)*100+100,
								100
							),
			photofinish_mt=photofinish_axis.map(d=>{
				let x=dimensions.length*d/best;
				return {
					t:d,
					dmt:x - dimensions.length
				}
			})

		//console.log(l,photofinish_axis,photofinish_mt)

		let tick=photofinish
			.selectAll("g.tick")
			.data(photofinish_mt)
			.enter()
			.append("g")
				.attr("class","tick")
				.attr("transform",(d)=>{
					let x=yscale(dimensions.lanes+dimensions.radius+dimensions.field.width),
						y=yscale(dimensions.lanes+dimensions.field.height-dimensions.lane*2/3);
					x=x-yscale(d.dmt);
					return `translate(${x},${y})`;
				})
		
		tick
			.append("line")
				.attr("x1",0)
				.attr("y1",0)
				.attr("x2",0)
				.attr("y2",yscale(dimensions.lane*0.2));
		tick
			.filter(d=>(d.t%200)>0)
			.append("text")
				.attr("x",0)
				.attr("y",-3)
				.text(d=>(formatSecondsMilliseconds(d.t,1)))

		let athlete_pf=photofinish
			.selectAll("g.athlete-pf")
			.data(athletes_data)
			.enter()
			.append("g")
				.attr("class","athlete-pf")
				.attr("transform",(d)=>{
					let split=d.splits[d.splits.length-1];
					let x=yscale(dimensions.lanes+dimensions.radius+dimensions.field.width),
						y=yscale(dimensions.lanes+dimensions.field.height);
					x=x-yscale(split.dmt);
					return `translate(${x},${y})`;
				});
		athlete_pf
				.append("line")
					.attr("x1",0)
					.attr("y1",-yscale(dimensions.lane/2)+1)
					.attr("x2",0)
					.attr("y2",yscale(dimensions.lanes-dimensions.lane/2)-1)
		athlete_pf
				.append("text")
					.attr("x",0)
					.attr("dx",-1)
					.attr("y",d=>{
						return yscale(d.lane * dimensions.lane + dimensions.lane/2 - dimensions.lane*0.15)
					})
					.text(d=>d.value)

		goTo(options.text[0].mt,options.text[0].story==="intro",true)

		
	}

	function buildTexts(state) {
		
		//console.log("buildTexts",CURRENT_STEP)

		

		let texts=options.text.filter(d=>d.state===(state || "story"));

		//console.log("TEXTS",texts,texts[CURRENT_STEP])
		
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
    				return "<p>"+d.description+"</p>";
    			})
    			.each(function(){
    				strokeShadow(this,2);
    			})

		
		let button=standfirst
						.selectAll("button")
		    				.data([texts[CURRENT_STEP].button]);

	    button
	    	.enter()
	    	.append("button")
		    	.on("click",()=>{
					CURRENT_STEP=(CURRENT_STEP+1)%texts.length;
					//console.log(CURRENT_STEP,texts[CURRENT_STEP].mt)
					//CURRENT_STEP=CURRENT_STEP===0?1:CURRENT_STEP;
					buildTexts();
					//deactivateButton();
					// if(texts[CURRENT_STEP].state!=="intro") {
					// 	swimming_pool.setAxis(texts[CURRENT_STEP].mt)
					// } else {
					// 	swimming_pool.setAxis(0)
					// }
					let story=options.text.filter(d=>(d.state==="story"))[CURRENT_STEP];
					goTo(story.mt,(d)=>{
						activateButton();
					},false,story.photofinish)
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
		//console.log("addAnnotation",CURRENT_DISTANCE)

		let annotations=options.text.filter(d=>(d.mt===CURRENT_DISTANCE && d.state==="annotation" && !d.time));

		let annotation=annotations_layer.selectAll("div.annotation").data(annotations);

		//console.log("ANNOTATIONS",annotations)

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
					/*//console.log("COORDS",d.coords)

					
					//console.log("OFFSET",offset)

					//console.log("LEFT",(d.coords[0]-offset.left))*/

					return (d.coords[0]-offset.left)+"px";
				})
				.style("top",d=>{
					//let offset=getOffset(annotations_layer.node());
					let dy=(d.mt%(dimensions.length*2)>0)?-24:18;
					return (d.coords[1]-(offset.top)+dy)+"px";
				})
				.html(d=>"<span>"+d.text+"</span>")

	}

	function removeGaps() {
		svg.selectAll("path").interrupt();
		svg.selectAll("path.gap").remove();
	}
	function showGap(el,s,best_time,first_run=false) {
		//console.log("showGap",el,s);

		//console.log("DURATION",s.cumulative_time-best_time)

		el
			.insert("path","path")
				.attr("class","gap")
				.attr("d",()=>{
					return oval.getPath(s.lane);
				})
				/*.attr("d",()=>{

					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						side=s.distance%(dimensions.length*2),
						start_y=(side>0)?yscale(side-s.dmt):yscale(s.dmt),
						y=yscale(side);
					
					//console.log("GAP PATH",s.lane,s.distance,s.mt,start_y,y)
					
					return line([
								[x,start_y],
								[x,start_y]
							]);

				})*/
				.attr("stroke-dasharray", function(){

					let l=this.getTotalLength();
					let interpolate = interpolateString("0," + l, l + "," + l);

					//let t = s.mt/s.distance;
					let t = s.distance>0?((s.mt)/dimensions.length):0;
					//console.log("G-INTERPOLATE",t,interpolate(t))

					return interpolate(t);

				})
				//.attr("stroke-width",Math.floor(xscale(dimensions.lane*0.5)))
				.attr("stroke-width",yscale(dimensions.lane-dimensions.line_width*2)*0.8)
				.transition()
				//.duration(s.cumulative_time-best_time)
				.duration(first_run?0:(s.cumulative_time-best_time)*multiplier)
				.ease(RunningLinear)
				/*.ease(()=>{
					if(s.distance===0) {
						//return Running200mEasing;
					}
					return RunningLinear;
				})*/
						.attr("stroke-dasharray", function(d){

							let l=this.getTotalLength();
							let interpolate = interpolateString("0," + l, l + "," + l);
							
							return interpolate(d.distance/dimensions.length);

						})
						

	}
	function addTime(distance,lane) {
		//console.log("addTime",distance,lane)

		let annotations=options.text.filter(d=>(d.mt===distance && d.lane===lane && d.state==="annotation" && d.time))[0];

		let annotation=annotations_layer.selectAll("div.annotation");//.data(annotations,d=>("time_"+distance+"lane"));

		//console.log("ANNOTATIONS",annotations)

		

		let xy,
			offset=getOffset(annotations_layer.node());

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
					//console.log("COORDS",d.coords)

					
					//console.log("OFFSET",offset)

					//console.log("LEFT",(d.coords[0]-offset.left))

					return (d.coords[0]-offset.left)+"px";
				})
				.style("top",d=>{
					//let offset=getOffset(annotations_layer.node());
					
					let dy=(d.mt%(dimensions.length*2)>0)?-24:18;

					return (d.coords[1]-(offset.top)+dy)+"px";
				})
				.html(d=>"<span>"+d.text+"</span>")
				.select("span")
					.style("margin-left",function(d){
						let coords=this.getBoundingClientRect();
						return (-coords.width/(d.mt===0?1.25:0.75))+"px";
					})

	}

	this.goTo = (distance) => {
		goTo(distance);
	}
	this.start = () => {
		start();
	}
	function start() {
		let t=interval((elapsed)=>{
			goTo(CURRENT_LEG);
			//console.log(CURRENT_LEG)
			CURRENT_LEG+=50;
			if(CURRENT_LEG>LEGS[LEGS.length-1]) {
				t.stop();
			}
		},1000)
	}

	function goTo(distance,text_update,first_run=false,__photofinish=false) {

		ts.forEach(t=>{
			clearTimeout(t);
			t=null;
		});

		container.classed("photo-finish",false);
		removeAnnotations();
		removeGaps();
		stopWatch.hide();

		CURRENT_DISTANCE=distance;

		container.classed("side50",(distance===50));
		container.classed("side100",(distance===100));

		let box = container.node().getBoundingClientRect();
			
		let hmargins=margins.left+margins.right;

		let ddScale;

		let w=box.width,
			drxScale;
		
		function transformTransition(status=1) {

			let transform;

			let dxScale=scaleLinear().domain([620,1260]).range([-1130,-2575]),
				dyScale=scaleLinear().domain([620,1260]).range([-110,-1120]),
				dzScale=scaleLinear().domain([620,1260]).range([330,330]),
				drxScale;

			transform = `rotateX(40deg) rotateY(10deg) rotateZ(17deg) translateZ(330px) translateX(${dxScale(w)}px) translateY(${dyScale(w)}px)`;

			if(w<480) {
				//`rotateX(40deg) rotateY(10deg) rotateZ(50deg) translateZ(260px) translateX(-90px) translateY(430px)`
				//`rotateX(40deg) rotateY(10deg) rotateZ(40deg) translateZ(250px) translateX(-395px) translateY(360px)`

				let dxScale=scaleLinear().domain([320,414]).range([-90,-395]),
					dyScale=scaleLinear().domain([320,414]).range([430,360]),
					dzScale=scaleLinear().domain([320,414]).range([260,250]),
					drzScale=scaleLinear().domain([320,414]).range([50,40])

				transform=`rotateX(40deg) rotateY(10deg) rotateZ(${drzScale(w)}deg) translateZ(${dzScale(w)}px) translateX(${dxScale(w)}px) translateY(${dyScale(w)}px)`;
			}

			if(distance===0) {

				drxScale=scaleLinear().domain([620,1260]).range([30,20]);
				dxScale=scaleLinear().domain([620,1260]).range([-50,-30]);
				dyScale=scaleLinear().domain([620,1260]).range([150,-170]);

				transform = `rotateX(${drxScale(w)}deg) rotateY(0deg) rotateZ(-10deg) translateZ(300px) translateX(${dxScale(w)}px) translateY(${dyScale(w)}px)`;

				if(w<480) {
					transform = `rotateX(25deg) rotateY(0deg) rotateZ(-35deg) translateZ(290px) translateX(20px) translateY(50px)`;
				}

			}
			if(distance!==0 && distance !==dimensions.length) {
				
				drxScale=scaleLinear().domain([620,1260]).range([50,45]);
				dxScale=scaleLinear().domain([620,1260]).range([40,120]);
				dyScale=scaleLinear().domain([620,1260]).range([-630,-2050]);
				dzScale=scaleLinear().domain([620,1260]).range([190,360]);

				transform = `rotateX(${drxScale(w)}deg) rotateY(0deg) rotateZ(-10deg) translateZ(${dzScale(w)}px) translateX(${dxScale(w)}px) translateY(${dyScale(w)}px)`;

				if(w<480) {
					transform = `rotateX(35deg) rotateY(0deg) rotateZ(10deg) translateZ(30px) translateX(-30px) translateY(-100px)`;
				}
				
			}


			if(__photofinish) {
				
				dxScale=scaleLinear().domain([620,1260]).range([-1200,-2400]);
				dyScale=scaleLinear().domain([620,1260]).range([-680,-1900]);
				dzScale=scaleLinear().domain([620,1260]).range([400,100]);
				transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateZ(${dzScale(w)}px) translateX(${dxScale(w)}px) translateY(${dyScale(w)}px) scale(1)`;
				
				if(w<480) {
					transform = `rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateZ(420px) translateX(-780px) translateY(-280px) scale(1)`;
				}
			}

			/*if(WIDTH<400) {
				//container.style("perspective","700px").style("perspective-origin","90% 20%")
				transform="rotateX(75deg) rotateY(0deg) rotateZ(10deg) translateX(67px) translateY(365px) translateZ(45px) scale(0.8)";
			}
			
			if(status===0) {
				transform = `rotateX(60deg) rotateY(0deg) rotateZ(50deg) translateZ(500px) translateX(-640px) translateY(295px)`;
			}*/
			
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
			/*if(status===0) {
				setTimeout(()=>{
					transformTransition(1)
				},1000)	
			}*/
			
		}
		
		transformTransition();

		if(__photofinish) {
			if(text_update){
				buildTexts();
				addAnnotation();
			}
			showPhotoFinish(distance);
			return;
		}

		

		let delta=20;

		if(w<480) {
			delta=15;
		}

		let selected_leg=leg
			.classed("visible",false)
			.filter(d=>(d.distance===distance))
				.classed("visible",true);
		

		selected_leg.selectAll("path")
			.attr("stroke-dasharray",function(d){
				return "0 "+this.getTotalLength();
			})

		selected_leg
				.filter(d=>(d.distance===distance && d.distance>0))
				.selectAll("textPath.athlete-name")
				    	.attr("startOffset",s=>{

				    		if(s.distance===0 || s.distance===dimensions.length) {
				    			return "0%"
				    		}
				    		console.log("TEXTPATH",200,s.distance,dimensions.lane_staggers[s.lane],200+dimensions.lane_staggers[s.lane]+100)
				    		console.log(s)
				    		let ratio=300/400;
				    		return ((ratio + (dimensions.lane_staggers[s.lane]*ratio)/400)*100)+"%";
				    		return ((0.5+(dimensions.lane_staggers[s.lane]/400))*100)+"%"
				    		return (((200+dimensions.lane_staggers[s.lane]+100)/400)*100)+"%"

				    		//return ((((200+s.distance)-dimensions.lane_staggers[s.lane])/400)*100)+"%";

				    		return (((s.mt) / dimensions.length)*100)+"%";

				    		return (s.distance>0)?"100%":"0%";
				    	})
				    	/*.transition()
				    	.duration(s=>{

							if(s.distance===0) {
								return best_cumulative_times[s.distance].best_time;
							}
							//let t=getTimeForDistance(best_cumulative_times[s.distance].best_cumulative,dimensions.length,delta)
							
							let t=getTimeForDistance(best_cumulative_times[s.distance].cumulative_times[s.lane],dimensions.length,delta)

							return t;
						})
						.delay(2000)
						.ease(RunningLinear)
				    	.attr("startOffset",s=>{

				    		return (((s.mt) / dimensions.length)*100)+"%";

				    		return (s.distance>0)?"100%":"0%";
				    	})*/
		selected_leg
			.selectAll("text.athlete-time")
			.classed("hidden",true)
			
		selected_leg
				.select("path")
					.attr("stroke-dasharray", function(s){

						let l=this.getTotalLength();
						let interpolate = interpolateString("0," + l, l + "," + l);						

						let delta2=(s.distance!==0 && s.distance!==dimensions.length)?delta*2:delta

						let t = s.distance>0?((s.mt-delta2)/dimensions.length):0;
						//console.log("1-INTERPOLATE",t,interpolate(t))
						return interpolate(t);

					})
					.transition()
					.duration((s,i)=>{

						if(first_run) {
							return 0;
						}

						if(s.distance===0) {
							return best_cumulative_times[s.distance].best_time;
						}
						//let t=getTimeForDistance(best_cumulative_times[s.distance].best_cumulative,dimensions.length,delta)
						
						let delta2=(s.distance!==0 && s.distance!==dimensions.length)?delta*2:delta

						let t=getTimeForDistance(best_cumulative_times[s.distance].cumulative_times[i],dimensions.length,delta2)

						//console.log("DURATION",t)

						return t*multiplier;
					})
					//.delay(2000)
					.delay(first_run?0:2000)
					.ease(RunningLinear)
					.attr("stroke-dasharray", function(s){

						let l=this.getTotalLength();
						let interpolate = interpolateString("0," + l, l + "," + l);

						let t = s.mt/dimensions.length;
						//console.log("2-INTERPOLATE",t,interpolate(t))

						return interpolate(t);

					})
						.on("start",(d,i)=>{

							ts.forEach(t=>{
								clearTimeout(t);
								t=null;
							});

							

							if(d.lane===GOLD_LANE) {

								if(!first_run) {
									stopWatch.showDistance(d.distance);	
								}

								if(d.distance===dimensions.length) {
									let position=d.position,
										record=options.record.split_times[position];
									if(!record && options.record.split_times.length===1) {
										position=0;
										record=options.record.split_times[position]
									}
									//console.log(position,record,options.record)
									let trecord=convertTime(record);
									//console.log(position,record,trecord)
									stopWatch.showRecord(options.record.split_times[position],false,false)	
								} else {
									stopWatch.hideRecord();
								}

								let duration;
								if(d.distance===0) {
									duration=best_cumulative_times[d.distance].best_time;
								}
								duration=getTimeForDistance(best_cumulative_times[d.distance].cumulative_times[i],dimensions.length,delta)

								//console.log("DURATION",duration)

								if(d.calculated) {
									stopWatch.hide();
								} else {
									
									//console.log("STARTING STOP WATCH AT ",best_cumulative_times[d.distance].best_cumulative,"-",duration)

									stopWatch.start(best_cumulative_times[d.distance].best_cumulative-duration);
								}
								
							}
						})
						.on("end",function(d){
							if(d.lane===GOLD_LANE) {
								if(text_update){
									buildTexts();
									addAnnotation();
								}
								//activateButton();
								if(d.distance>0) {
									//console.log("!!!!!!!",d)
									let position=d.position,//LEGS.indexOf(+d.distance),
										record=options.record.split_times[position];
									
									if(!record && options.record.split_times.length===1) {
										position=0;
										record=options.record.split_times[position]
									}

									let trecord=convertTime(record),
										gap=best_cumulative_times[d.distance].best_cumulative-trecord;
									//console.log("!!!!!!!!",record,trecord,gap,formatSecondsMilliseconds(gap))	
									stopWatch.showRecord(options.record.split_times[position],gap,false)//position<LEGS.length-2)
								} else {
									stopWatch.hideRecord();
								}
								if(first_run) {
									container.classed("w_transition",true)
								}
							}

							

							/*select(this.parentNode)
								.selectAll("textPath")
							    	.attr("startOffset",s=>{

							    		return (((s.mt) / dimensions.length)*100)+"%";

							    		return (s.distance>0)?"99%":"0%";
							    	})*/

							if(d.distance===dimensions.length) {
								showGap(select(this.parentNode),d,best_cumulative_times[d.distance].best_cumulative,first_run);
							}

							
							if(d.cumulative_time===best_cumulative_times[d.distance].best_cumulative) {
								stopWatch.stop(d.cumulative_time);
							}
							
							if(d.distance%dimensions.length===0) {
								let delay=d.cumulative_time-best_cumulative_times[d.distance].best_cumulative;
								ts.push(
									setTimeout(()=>{
										// let entrant=athletes_data.filter(a=>a.lane===d.lane)[0],
										// 	gap=d.cumulative_time-best_cumulative_times[d.distance].best_cumulative;

										selected_leg
											.filter(t=>t.lane===d.lane)
												.selectAll("text.athlete-time")
												.classed("hidden",false)

										//addTime(d.distance,d.lane);

									},first_run?10:delay*multiplier)
								);	
							}

							
						})
						

		
		

	}

	function showPhotoFinish(distance) {

		
		container.classed("photo-finish",true);
		leg
			.filter(d=>(d.distance===distance))
				.select("path")
					.attr("stroke-dasharray", function(s){

						let l=this.getTotalLength();
						let interpolate = interpolateString("0," + l, l + "," + l);

						let t = s.mt/dimensions.length;
						//console.log("2-INTERPOLATE",t,interpolate(t))

						return interpolate(t);

					})
		leg
			.selectAll("text.athlete-time")
			.classed("hidden",true)

	}

	this.getPosition = (lane,distance) => {
		return getPosition(lane,distance);
	}

	function getPosition(lane,distance) {

		let x=xscale(lane*dimensions.lane + dimensions.lane/2),
			y=(distance%(dimensions.length*2)>0)?yscale(dimensions.length):yscale(0);

		//console.log("POSITION",lane,distance,"->",x,y)

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

function Track(options) {

		

		let hscale=options.hscale,
			vscale=options.vscale;

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};

	   	let track=options.svg
					.append("g")
					.attr("class","track")
					.attr("transform",`translate(${margins.left},${margins.top})`)
		

		


		track
			.append("g")
				.attr("class","tarmac")
					.append("path")
						.attr("d",()=>{
							let points=[
								[hscale(0),vscale(0)],
								[hscale(dimensions.lane*(dimensions.lanes_n+1)),vscale(0)],
								[hscale(dimensions.lane*(dimensions.lanes_n+1)),vscale(dimensions.length)],
								[hscale(0),vscale(dimensions.length)]
							];
							return d3_line()(points.map(p=>{
								//console.log(p,perspT.transform(p[0],p[1]))
								return [p[0],p[1]]
							}))
						})

		let lanes=[
				{
					lanes:range(dimensions.lanes_n).map(d=>{
						return [[hscale(dimensions.lane*(d+1)),vscale(dimensions.length)],[hscale(dimensions.lane*(d+1)),vscale(0)]]
					}),
					colors:["g","b","b","y","y","y","b","b","g"]
				}
				
		];
		//console.log("LANES",lanes)
		track
			.selectAll("path.lane-lines")
			.data(lanes)
			.enter()
				.append("g")
					.attr("class","lane-lines")
					.selectAll("path.lane-line")
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
							//.attr("class",d=>("lane-line "+d.color))
							.attr("class",d=>("lane-line"))
							.style("fill","none")
							.attr("d",d=>{
								//console.log("rope",d.rope)
								return d3_line()(d.rope.map(p=>{
									return [p[0],p[1]]
								}))
							})
							//.style("stroke","url(#lineGradient)")

		let distances=[50,dimensions.length];
		track.selectAll("text.axis")
				.data(distances)
				.enter()
				.append("text")
					.attr("class","axis")
					.attr("x",hscale(dimensions.lane*(dimensions.lanes_n+1)))
					.attr("y",d=>vscale(d))
					.attr("dy","0em")
					.text(d=>(d+"m"))
		return;
		
}