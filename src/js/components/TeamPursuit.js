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
	sum as d3_sum
} from 'd3-array';
import {
	nest
} from 'd3-collection';
import {
	format as d3_format
} from 'd3-format';
import {
	line as d3_line
} from 'd3-shape';
import PerspT from 'perspective-transform';
import {
	getOffset,
	getPerspective
} from '../lib/dom';
import Barchart from './Barchart';


import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import {
	convertTimeHMS,
	convertTime,
	formatSecondsMilliseconds,
	getTimeForDistance
} from '../lib/time';

import {
	dimensions,
	CyclingEasing,
	CyclingLinear
} from '../lib/cycling'

import Velodrome from './Velodrome';

import StopWatch from "./StopWatch";

export default function TeamPursuit(data,options) {

	console.log("TeamPursuit",data.olympics.eventUnit.result.entrant);

	let yscales={},
		teams_data=[];

	let best_cumulative_times={};

	let container,
		annotations_layer,
		overlay,
		perspectives=[];

	let CURRENT_STEP=0;

	let hscale,
		vscale;

	let stopWatch;

	let annotation_time;

	let velodrome;

	let frameRequest = requestAnimFrame(function checkInnerHTML(time) {
        ////console.log(time)
        
        if(options.container && options.container.getBoundingClientRect().height) {
            cancelAnimFrame(checkInnerHTML);
           	
			buildEvent();

            return; 
        }
        frameRequest = requestAnimFrame(checkInnerHTML);
    });

    function buildEvent() {
    	
    	teams_data=data.olympics.eventUnit.result.entrant.map(entrant => {
    		let prev_cumulative_time=0;
    		return {
    			"team":entrant.country.identifier,
    			"splits":entrant.resultExtension[0].extension.filter((d,i)=>((+d.position<=4 && i%2===1)||(i>6))).map((d,i)=>{
    				let cumulative_time=convertTimeHMS(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;

    				return {
    					value:d.value,
    					time:lap_time,
    					cumulative_time:cumulative_time,
    					distance:+d.position*0.125
    				}
    			}),
    			"kms":entrant.resultExtension[0].extension.filter((d,i)=>(+d.position<=4 && i%2===0)).map((d,i)=>{
    				let cumulative_time=convertTimeHMS(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;
    				return {
    					value:d.value,
    					time:lap_time,
    					cumulative_time:cumulative_time,
    					distance:+d.position
    				}
    			}),
    			"entrant":entrant
    		}
    	});

    	teams_data.forEach(team=>{
    		if(!best_cumulative_times[0]) {
				best_cumulative_times[0]={
					cumulative_times:[],
    				times:[]
				}
			}
			
			team.splits=([{
				value:"00:00",
				time:0,
				cumulative_time:0,
				distance:0
			}]).concat(team.splits)

    		team.splits.forEach((split,i)=>{
    			split.index=i;

    			if(!best_cumulative_times[split.distance]) {
    				best_cumulative_times[split.distance]={
    					cumulative_times:[],
    					times:[]
    				}
    			}
    			
    			best_cumulative_times[split.distance].times.push(split.time)
    			best_cumulative_times[split.distance].cumulative_times.push(split.cumulative_time)
    			

    		})
    	});

    	for(let distance in best_cumulative_times) {
    		best_cumulative_times[distance].best_time=d3_min(best_cumulative_times[distance].times);
    		best_cumulative_times[distance].best_cumulative=d3_min(best_cumulative_times[distance].cumulative_times);
    		best_cumulative_times[distance].times=best_cumulative_times[distance].times.sort((a,b)=>(a-b));
    		best_cumulative_times[distance].times=best_cumulative_times[distance].cumulative_times.sort((a,b)=>(a-b));
    	}

    	teams_data.forEach(s => {

			

			//s.splits=splits;

			let prev={
				mt:0,
				dmt:0,
				dt:0
			}
			s.splits.forEach(split => {

				let gap=split.cumulative_time-best_cumulative_times[split.distance].best_cumulative,
					text=(gap>0)?`+${formatSecondsMilliseconds(gap,2)}`:split.value;


				let distance=split.distance;

				split.dt=split.time - best_cumulative_times[split.distance].best_time;
				split.mt=split.cumulative_time?distance*best_cumulative_times[split.distance].best_cumulative/split.cumulative_time:split.cumulative_time;
				split.dmt=distance-split.mt;

				split.prev={
					mt:prev.mt,
					dmt:prev.dmt,
					dt:split.dt
				};

				prev.mt=split.mt;
				prev.dmt=split.dmt;

				options.text.push({
					"state":"annotation",
					"time":true,
					"mt":split.distance,//(LEGS.length-1)*dimensions.length,
					"lane":s.lane,
					"description":split.distance===0?split.value:text//,
					//"records":split.distance===LEGS[LEGS.length-1]?s.records:[]
				})	

			});
			
		})

    	console.log(teams_data)
		console.log(best_cumulative_times)



		buildVisual();

	}

	function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","team-pursuit")

	    annotations_layer=container
								.append("div")
								.attr("class","annotations");

	    overlay=container
						.append("div")
						.attr("class","rio-overlay");

	    let box = container.node().getBoundingClientRect();
	    let ratio = (85.73+25.0*2)/50,
	    	WIDTH = box.height*ratio,
	        HEIGHT = box.height;

	    if(WIDTH>box.width) {
	    	WIDTH=box.width;
	    	HEIGHT=WIDTH/ratio;
	    }

	    let svg=container
	    			.append("svg")
	    			.attr("width",WIDTH)
	    			.attr("height",HEIGHT)
	    			.each(function(){
			    		stopWatch=new StopWatch({
							container:options.container,
							svg:this,
							multiplier:options.multiplier
						});
			    	})

	    
	    

	    hscale=scaleLinear().domain([0,dimensions.radius*2+dimensions.field.width+dimensions.lane_width]).range([0,WIDTH-(margins.left+margins.right)]);
    	vscale=scaleLinear().domain([0,dimensions.field.height+dimensions.lane_width]).range([0,HEIGHT-(margins.top+margins.bottom)]);

    	overlay
			.style("top",0)//margins.left+"px")
	    	.style("left",0)//margins.top+"px")
	   		.style("width",WIDTH+"px")//hscale.range()[1]+"px")
	    	.style("height",HEIGHT+"px")//vscale.range()[1]+"px")

	    buildTexts("intro");

	    velodrome=new Velodrome({
	    	container:container,
	    	svg:svg,
	    	width:WIDTH,
	    	height:HEIGHT,
	    	margins:margins,
	    	multiplier:options.multiplier,
	    	hscale:hscale,
	    	vscale:vscale,
	    	splitCallback:((team,split)=>{
	    		addTime(team,split);
	    	})
	    })

	    teams_data.forEach((team,i) => {
	    	velodrome.addTeam(i,team);
	    	addTime(i,0);
	    })

	    let splits=teams_data[0].splits.map((s,i)=>{
	    	return {
	    		values:[
	    			s.value,
	    			teams_data[1].splits[i].value
	    		],
	    		times:[
	    			s.time,
	    			teams_data[1].splits[i].time
	    		],
	    		cumulative_times:[
	    			s.cumulative_time,
	    			teams_data[1].splits[i].cumulative_time
	    		],
	    		diff:s.cumulative_time - teams_data[1].splits[i].cumulative_time
	    	}
	    });
	    /*let barchart=new Barchart(splits,{
	    	container:container
	    })*/

	    /*let team=overlay.selectAll("div.team-info")
	    			.data(teams_data)
	    			.enter()
	    			.append("div")
	    				.attr("class","team-info")
	    				.classed("right",(d,i)=>(i===1))
	    				.classed("gold",d=>{
							if(!Array.isArray(d.entrant.property)) {
								return false;
							}
							return d.entrant.property.filter(p=>{
								return p.type=="Medal Awarded" && p.value==="Gold"
							})[0]
						})
						.classed("silver",d=>{
							if(!Array.isArray(d.entrant.property)) {
								return false;
							}
							return d.entrant.property.filter(p=>{
								return p.type=="Medal Awarded" && p.value==="Silver"
							})[0]
						})
	    				.style("top",(d,i)=>{
	    					return vscale(i?dimensions.field.height:dimensions.lane_width)+(i?-40-25:0-10)+"px"
	    				})
	    				.style("left",(d,i)=>{
	    					return hscale(dimensions.radius+dimensions.field.width/2)+"px"
	    				})*/
	    
	    /*let h3=team.append("h3");

		h3.append("b").text(d=>d.team)
	    annotation_time=h3.append("span")*/




	    //velodrome.race();
	    //console.log(options)

	    //velodrome.goFromTo(+options.text[0].from,+options.text[0].to)
	    //velodrome.goFrom(3)

	    goFromTo(options.text[0]);
	    
	}

	function goFromTo(info) {
		addTime(0,teams_data[0].splits.filter(d=>d.distance == +info.from)[0].index);
		addTime(1,teams_data[1].splits.filter(d=>d.distance == +info.from)[0].index);
		velodrome.goFromTo(+info.from,+info.to)
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
    			});

		
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
					
					/*goTo(options.text.filter(d=>d.state==="story")[CURRENT_STEP].mt,(d)=>{
						activateButton();
					})*/
					let story=options.text.filter(d=>d.state==="story")[CURRENT_STEP];

					goFromTo(story);
				})
			.merge(button)
				.classed("replay",d=>(d.toLowerCase()==="replay"))
				.text(d=>d)

	}

	/*function updateTeam(team,split) {

    	console.log("updateTeam",team,split)

    	

    	let times=[
    			teams_data[0].splits[split],
    			teams_data[1].splits[split]
    		],
    		_time=teams_data[team].splits[split].value,
    		diff=times[team].cumulative_time-times[+!team].cumulative_time;


    	if(diff>0) {
    		_time="+"+formatSecondsMilliseconds(diff);
    	}


    	annotation_time.filter((d,i)=>(i===team)).html(_time+(" <i>"+((split)*125)+"m</i>"))



    }*/

    function addTime(team,split) {
		console.log("addTime",team,split)

		
		let times=[
    			teams_data[0].splits[split],
    			teams_data[1].splits[split]
    		],
    		_time=teams_data[team].splits[split].value,
    		diff=times[team].cumulative_time-times[+!team].cumulative_time;


    	if(diff>0) {
    		_time="+"+formatSecondsMilliseconds(diff);
    	}

		

		let xy;
		let offset=getOffset(annotations_layer.node());

		//console.log(offset)

		annotations_layer
			.selectAll("div.time")
			.filter(d=>d.team===team)
			.remove("div.time")

		
		annotations_layer
			.append("div")
				.datum({
					distance:split*125,
					time:_time,
					diff:diff,
					team:team
				})
				.attr("class","annotation time")
				.classed("gold",(d)=>!d.team)
				.classed("silver",(d)=>d.team)
				.style("left",d=>{
					
					let x=hscale(dimensions.radius+dimensions.field.width/2),
						y=vscale(team?dimensions.field.height:dimensions.lane_width)

					let overlayPersp=computePerspective();
					
					d.coords=overlayPersp.transform(x,y)
					xy=[x,y];

					console.log(xy)

					return (d.coords[0]-offset.left)+"px";
				})
				.style("top",d=>{
					//let offset=getOffset(annotations_layer.node());
					return (d.coords[1]-(offset.top)+(!d.team?16:-45))+"px";
				})
				.html(d=>{
					return "<h3>"+teams_data[team].team+"</h3><span>"+d.time+("</span><i>"+(d.distance)+"m</i>")
				})
				


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

	function computePerspective() {

		

		let coords=[
			[hscale.range()[0],vscale.range()[0]],
			[hscale.range()[1],vscale.range()[0]],
			[hscale.range()[1],vscale.range()[1]],
			[hscale.range()[0],vscale.range()[1]]
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

		//console.log(srcPts,dstPts)

		//perspectives[side] = PerspT(srcPts, dstPts);

		return PerspT(srcPts, dstPts);
	}

}