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

	//console.log("TeamPursuit",data.olympics.eventUnit.result.entrant);

	let yscales={},
		teams_data=[];

	let best_cumulative_times={};

	let container,
		annotations_layer,
		overlay,
		svg,
		perspectives=[];

	let CURRENT_STEP=0;

	let CURRENT_PERSPECTIVE,
		WIDTH,
		HEIGHT;

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
    			"speed":entrant.resultExtension.filter(d=>d.type=="Average Speed")[0].value,
    			"entrant":entrant,
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
				split.dt_cumulative=split.cumulative_time - best_cumulative_times[split.distance].best_cumulative;
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

    	//console.log(teams_data)
		//console.log(best_cumulative_times)



		buildVisual();

	}

	function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	
	    container=select(options.container)
	    					.append("div")
	    					.attr("id","team-pursuit")

	    select(options.container)
	    		.append("div")
	    		.attr("class","notes")
	    		.html("The positions are based on the athletes' average speed. Race at 2x speed.")

	    

	    overlay=container
						.append("div")
						.attr("class","rio-overlay");

	    let box = container.node().getBoundingClientRect();
	    let ratio = (85.73+25.0*2)/50;
	    WIDTH = box.height*ratio;
	    HEIGHT = box.height;

	    if(WIDTH>box.width) {
	    	WIDTH=box.width;
	    	HEIGHT=WIDTH/ratio;
	    }
	    


	    if(box.width<=480) {

	    	WIDTH=568;
	    	HEIGHT=WIDTH/ratio;

	    	//margins.left*=1.6;

	    	container.style("height",WIDTH+"px")
	    } else {
	    	WIDTH=WIDTH*2;
		    HEIGHT=HEIGHT*2;



		    margins.left*=2.5;
		    margins.right*=2.5;
		    margins.top*=2.5;
		    margins.bottom*=2.5;	
	    }

	    

	    svg=container
	    			.append("svg")
	    			.attr("width",WIDTH)
	    			.attr("height",HEIGHT)
	    			.each(function(){
			    		stopWatch=new StopWatch({
							container:options.container,
							svg:this,
							multiplier:1/options.multiplier
						});
			    	})

	    annotations_layer=container
								.append("div")
								.attr("class","annotations");
	    

	    hscale=scaleLinear().domain([0,dimensions.radius*2+dimensions.field.width+dimensions.lane_width]).range([0,WIDTH-(margins.left+margins.right)]);
    	vscale=scaleLinear().domain([0,dimensions.field.height+dimensions.lane_width]).range([0,HEIGHT-(margins.top+margins.bottom)]);

    	overlay
			.style("top",0)//margins.left+"px")
	    	.style("left",0)//margins.top+"px")
	   		.style("width",WIDTH+"px")//hscale.range()[1]+"px")
	    	.style("height",HEIGHT+"px")//vscale.range()[1]+"px")

	    buildTexts("intro");

	    //CATCHING IE9
		if(typeof window.atob == "undefined") {
			document.querySelector(".interactive-embed").className="interactive-embed js-interactive fallback";
			return;
		}

	    velodrome=new Velodrome({
	    	container:container,
	    	svg:svg,
	    	width:WIDTH,
	    	height:HEIGHT,
	    	margins:margins,
	    	multiplier:options.multiplier,
	    	hscale:hscale,
	    	vscale:vscale,
	    	splitCallback:((team,split,split_obj)=>{
	    		addTime(team,split);
	    		stopWatch.showDistance(split_obj.distance);

	    		let record=options.record.split_times[split];
				let trecord=convertTime(record),
					gap=best_cumulative_times[split_obj.distance].best_cumulative-trecord;

	    		stopWatch.showRecord(options.record.split_times[split],gap,split_obj.distance<4)
	    	}),
	    	stopWatch_callback:(split)=>{
	    		if(split.cumulative_time===best_cumulative_times[split.distance].best_cumulative) {
					stopWatch.stop(split.cumulative_time);
				}
	    	}
	    })

	    teams_data.reverse().forEach((team,i) => {
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
		options.text[0].perspective="bottom_center";
	    setPerspective(options.text[0].perspective,()=>{
			goFromTo(options.text[0])
		})

	    //goFromTo(options.text[0]);
	    
	}

	function goFromTo(info) {

		let split0=teams_data[0].splits.filter(d=>d.distance == +info.from)[0],
			split1=teams_data[1].splits.filter(d=>d.distance == +info.from)[0];

		//let duration=best_cumulative_times[info.from].best_time*(delta/dimensions.length);
		//console.log(info)
		stopWatch.start(best_cumulative_times[(+info.from)+""].best_cumulative,true);	
		stopWatch.showDistance((+info.from)+"");

		let record=options.record.split_times[split0.index];
		let trecord=convertTime(record),
			gap=best_cumulative_times[split0.distance].best_cumulative-trecord;

		if(split0.distance>0) {
			stopWatch.showRecord(options.record.split_times[split0.index],gap,split0.distance<4)	
		} else {
			stopWatch.hideRecord();
		}
		

		addTime(0,split0.index);
		addTime(1,split1.index);
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

					setPerspective(story.perspective,()=>{
						goFromTo(story)
					})

					
				})
			.merge(button)
				.classed("replay",d=>(d.toLowerCase()==="replay"))
				.text(d=>d)

	}
	function removeAnnotations() {
		annotations_layer.selectAll("div.annotation").remove();
	}
	function setPerspective(perspective="none",callback) {

		velodrome.cancelTransitions();
		removeAnnotations();
		stopWatch.hide();


		if(perspective!=CURRENT_PERSPECTIVE && CURRENT_PERSPECTIVE!="center_bottom_small") {
			
			

			let transform="scale(0.51) translateX(-50%) translateY(-50%)";

			let box = container.node().getBoundingClientRect();

			if(box.width<=480) {
				//transform=`rotateX(0deg) rotateY(0deg) rotateZ(90deg) translateX(38%) translateY(60%) translateZ(0px) scale(1.1)`;	
				
				
				let drxScale=scaleLinear().domain([320,414]).range([30,30]),
					dxScale=scaleLinear().domain([320,414]).range([53,60]),
					dyScale=scaleLinear().domain([320,414]).range([65,42]),
					dzScale=scaleLinear().domain([320,414]).range([0,20]),
					dsScale=scaleLinear().domain([320,414]).range([1.1,1]);

				transform=`rotateX(${drxScale(box.width)}deg) rotateY(0deg) rotateZ(90deg) translateX(${dxScale(box.width)}%) translateY(${dyScale(box.width)}%) translateZ(${dzScale(box.width)}px) scale(${dsScale(box.width)})`;

				CURRENT_PERSPECTIVE="center_bottom_small";

			} else {
				if(perspective==="bottom_left" || perspective==="left_bottom") {
					let w=box.width;
					//rotateX(25deg) rotateY(0deg) rotateZ(-25deg) translateX(-275px) translateY(-150px) translateZ(20px) scale(0.7)
					//rotateX(25deg) rotateY(0deg) rotateZ(-25deg) translateX(-250px) translateY(-550px) translateZ(70px) scale(0.7)
					let dxScale=scaleLinear().domain([800,1260]).range([-275,-250]),
						dyScale=scaleLinear().domain([800,1260]).range([-155,-550]),
						dzScale=scaleLinear().domain([800,1260]).range([20,70]);
					transform=`rotateX(25deg) rotateY(0deg) rotateZ(-25deg) translateX(${dxScale(w)}px) translateY(${dyScale(w)}px) translateZ(${dzScale(w)}px) scale(0.7)`
				}
				if(perspective==="bottom_right" || perspective==="right_bottom") {

					let w=box.width;

					let dxScale=scaleLinear().domain([800,1260]).range([-420,-820]),
						dyScale=scaleLinear().domain([800,1260]).range([170,40]),
						dzScale=scaleLinear().domain([800,1260]).range([50,100]);
					transform=`rotateX(25deg) rotateY(0deg) rotateZ(25deg) translateX(${dxScale(w)}px) translateY(${dyScale(w)}px) translateZ(${dzScale(w)}px) scale(0.7)`
				}
				if(perspective==="bottom_center" || perspective==="center_bottom") {
					
					let w=box.width;

					let rxScale=scaleLinear().domain([620,1260]).range([0,25]);

					transform=`rotateX(${rxScale(w)}deg) rotateY(0deg) rotateZ(0deg) translateX(-23%) translateY(-30%) translateZ(-10px) scale(0.75)`;
					//transform =`rotateX(${rxScale(w)}deg) rotateY(0deg) rotateZ(0deg) translateX(-23%) translateY(-18%) translateZ(-40px) scale(0.75)`;
				}

				CURRENT_PERSPECTIVE=perspective;
			}

			annotations_layer.attr("class",`annotations p_${CURRENT_PERSPECTIVE}`)
			

			

			

			

			svg
				.style("-webkit-transform",transform)
	    		.style("-moz-transform",transform)
	    		.style("-ms-transform",transform)
	    		.style("transform",transform)
				.transition()
				.duration(0)
				.delay(1000)
					.on("end",()=>{
						if(callback) {
							//console.log("CALLBACK!")
							callback();
						}
					})
			overlay
		    		.style("-webkit-transform",transform)
		    		.style("-moz-transform",transform)
		    		.style("-ms-transform",transform)
		    		.style("transform",transform);

		} else {
			CURRENT_PERSPECTIVE=perspective;
			callback();	
		}
		
		
		
		

	}
	/*function updateTeam(team,split) {

    	//console.log("updateTeam",team,split)

    	

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
		//console.log("addTime",team,split)

		
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
					value:_time,
					diff:diff,
					team:team,
					time:times[team].cumulative_time
				})
				.attr("class","annotation time s"+team)
				.classed("gold",(d)=>d.team)
				.classed("silver",(d)=>!d.team)
				.style("left",d=>{
					
					let x=hscale(dimensions.radius+dimensions.field.width/2),
						y=vscale(team?dimensions.field.height:dimensions.lane_width)

					let overlayPersp=computePerspective();
					
					d.coords=overlayPersp.transform(x,y)
					xy=[x,y];

					//console.log(xy)

					return (d.coords[0]-offset.left)+"px";
				})
				.style("top",d=>{
					//let offset=getOffset(annotations_layer.node());
					return (d.coords[1]-(offset.top)+(!d.team?16:-45))+"px";
				})
				.html(d=>{
					let distance=d.distance+"m";
					let wr="";
					if(d.distance===0) {
						return "<h3>"+teams_data[team].team+"</h3>";
					}
					if(d.distance===4000) {
						distance=teams_data[team].speed+"km/h";
						if(teams_data[team].records.indexOf("WR")>-1) {
							wr="<b>WR</b>"
						}
					}
					
					return "<h3>"+teams_data[team].team+"</h3><span>"+wr+d.value+("</span><i>"+distance+"</i>")
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