import {
    select,
    selectAll
} from 'd3-selection';
import {
	scaleLinear,
	scalePoint
} from 'd3-scale';
import {
	max as d3_max,
	min as d3_min,
	extent,
	sum as d3_sum,
	range
} from 'd3-array';
import {
	nest
} from 'd3-collection';
import {
	format as d3_format
} from 'd3-format';
import {
	line as d3_line,
	curveCardinal,
	curveMonotoneX
} from 'd3-shape';
import {
	transition
} from 'd3-transition';
import {
	interpolateString
} from 'd3-interpolate';
import {
	axisBottom
} from 'd3-axis';
import {
	interval
} from 'd3-timer';
//import Barchart from './Barchart';
import PerspT from 'perspective-transform';
import {getOffset} from '../lib/dom';

import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import {
	convertTimeHMS,
	convertTime,
	formatSecondsMilliseconds,
	getDistance
} from '../lib/time';

import {
	dimensions,
	DiveEasing,
	SwimmingLinear
} from '../lib/swimming'

//import Velodrome from './Velodrome';

export default function SwimmingLineChart(data,options) {

	//console.log("SwimmingLineChart",data.olympics.eventUnit.result.entrant);

	let swimmers_data=[],
		best_cumulative_times={},
		CURRENT_LEG=0,
		CURRENT_STEP=0,
		CURRENT_DISTANCE=0,
		LEGS=[],
		WR;

	let container,
		overlay,
		perspectives=[],
		annotations_layer,
		svg,
		leg,
		athlete,
		marker,
		xscale,
		yscale,
		line = d3_line();//.curve(curveMonotoneX)

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

    	//swimmers_data=data.olympics.eventUnit.result.entrant.sort((a,b)=>(+a.order - +b.order)).map(entrant => {
    	swimmers_data=data.olympics.eventUnit.result.entrant.map(entrant => {
    		let prev_cumulative_time=0;
    		return {
    			"swimmer":entrant.participant.competitor.fullName,
    			"lane":+entrant.order,
    			"reaction_time":{
    				value:entrant.resultExtension[REACTION_TIME].value,
    				time: +entrant.resultExtension[REACTION_TIME].value * 1000
    			},
    			"splits":entrant.resultExtension[SPLITS].extension.map((d,i)=>{
    				let cumulative_time=convertTime(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;



    				return {
    					value:d.value,
    					time:lap_time,
    					cumulative_time:cumulative_time,
    					distance:+d.position*50
    					//cumulative_time:distance==best_cumulative_time:x
    				}
    			}),
    			"entrant":entrant,
    			"value":entrant.value
    		}
    	});

    	LEGS=range(swimmers_data[0].splits.length+1).map(d=>d*50);
    	

    	swimmers_data.forEach(swimmer=>{
    		if(!best_cumulative_times[0]) {
				best_cumulative_times[0]={
					cumulative_times:[],
    				times:[]
				}
			}
			best_cumulative_times[0].times.push(swimmer.reaction_time.time)
			best_cumulative_times[0].cumulative_times.push(swimmer.reaction_time.time)

    		swimmer.splits.forEach(split=>{
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
    	console.log(swimmers_data)
		console.log(best_cumulative_times)

		
		swimmers_data.forEach(s => {
			options.text.push({
				"type":"annotation",
				"mt":200,
				"lane":s.lane,
				"text":s.value
			})
		})

		buildVisual();

	}
	function buildVisual() {

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};

		//let ul=select(options.container).append("ul");
    	
		

		

		

	    container=select(options.container)
	    					.append("div")
	    					.attr("class","swimming-perspective");

	    annotations_layer=container
								.append("div")
								.attr("class","annotations");

	    overlay=container
						.append("div")
						.attr("class","rio-overlay");

		

	    svg=container.append("svg")
	    // overlay=container.append("div")
	    // 			.attr("class","overlay")

	    let box = container.node().getBoundingClientRect();
	    let WIDTH = box.width,
	        HEIGHT = box.width>414?box.width:box.height;

	    svg
	    	.attr("width",WIDTH)
	    	.attr("height",HEIGHT)

	   	overlay
	   		.style("width",WIDTH+"px")
	    	.style("height",HEIGHT+"px")
	    
	    console.log(WIDTH,"x",HEIGHT)
	    

	    let time_extent=extent(LEGS.map(l=>{
	    	let leg_extent=extent(best_cumulative_times[l].cumulative_times);
	    	return leg_extent[1]-leg_extent[0];
	    }))

	    //console.log("TIME_EXTENT",time_extent)
	    

		xscale=scaleLinear().domain([0,(dimensions.lanes_n+1)*dimensions.lane]).range([0,WIDTH-(margins.left+margins.right)]);
		yscale=scaleLinear().domain([0,dimensions.length]).range([HEIGHT-(margins.top+margins.bottom),0]);
		
		
		//computePerspective();
					
		buildTexts("intro");
		

		/*ul.selectAll("li")
					.data([0,50,100,150,200])
					.enter()
					.append("li")
						.text(d=>d)
						.on("click",(d)=>{
							//svg.classed("end-side",goTo)
							goTo(d)
						})*/

		let pool={
			w:xscale(dimensions.lane*(dimensions.lanes_n+1)),
			h:yscale(0)
		};
		console.log("POOL",pool)
		let srcCorners = [
						0, 0, 
						pool.w, 0,
						pool.w, pool.h,
						0, pool.h
					];
		let dstCorners = [
						pool.w*0.3, 0,
						pool.w*0.7, 0, 
						pool.w, pool.h,
						0, pool.h
					];

		
		dstCorners = [
						0, 0, 
						pool.w-0, 0,
						pool.w, pool.h,
						0, pool.h
					];

		//console.log(srcCorners,dstCorners)

		let perspT = PerspT(srcCorners, dstCorners);

		//return;

		new SwimmingPool({
				svg:svg,
				margins:margins,
				hscale:xscale,
				vscale:yscale,
				perspT:perspT
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

						//console.log("SWIMMER",ath,best_cumulative_times)

						ath.splits=([{
							value:ath.reaction_time.value,
							time:ath.reaction_time.time,
							cumulative_time:ath.reaction_time.time,
							distance:0
						}]).concat(ath.splits);

						return ath.splits.map(d=>{

							let distance=d.distance || 3.5;
							d.mt=distance*best_cumulative_times[d.distance].best_cumulative/d.cumulative_time;
							d.dmt=distance-d.mt;
							d.lane=ath.lane;
							if(d.distance===0) {
								console.log(d)
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

					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						start_y=(s.distance%(dimensions.length*2)>0)?yscale(0):yscale(dimensions.length);
						/*,
						dist=s.distance-s.mt,
						y=(s.distance%(dimensions.length*2)>0)?yscale(dimensions.length-dist):yscale(dist);
						*/

					return line([
								/*perspT.transform(x-w/2,start_y),
								perspT.transform(x+w/2,start_y),
								perspT.transform(x+w/2,start_y),
								perspT.transform(x-w/2,start_y),
								perspT.transform(x-w/2,start_y)*/
								perspT.transform(x,start_y),
								perspT.transform(x,start_y),
								perspT.transform(x,start_y)
							]);


				})
				.style("stroke-width",xscale(1.2))


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
				.append("path")
				.attr("id",(s)=>("t_guide_"+s.lane+"_"+s.distance))
				.attr("class","guide-text-path")
				.attr("d", (s) => {
					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						y0=yscale(0),
						y1=yscale(s.mt);
					return `M${x},${y0}L${x},${y1}`;
				});

		/*leg.append("text")
				.attr("class","swimmer-name stroke")

		leg.filter(s=>(s.distance===0))
				.select("text.stroke")
					.attr("dx",5)
				    .attr("dy","0.35em")
					.append("textPath")
				    	.attr("xlink:href", s=>("#guide_"+s.lane+"_"+s.distance))
				    	.attr("text-anchor","start")
				    	.attr("startOffset","0%")
				    	.text(s=>{
							let swimmer=swimmers_data.find(d=>(d.lane===s.lane))
							return swimmer.reaction_time.value+"  "+swimmer.entrant.participant.competitor.lastName;
						})


		leg.filter(s=>(s.distance>0))
				.select("text.stroke")
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
						let swimmer=swimmers_data.find(d=>(d.lane===s.lane))
						return swimmer.entrant.participant.competitor.lastName+" "+swimmer.value;
					})*/

		

		

		leg.filter(s=>(s.distance===0))
			.selectAll("text")
			.data(s=>([s,s,s,s]))
			.enter()
			.append("text")
				.attr("class","swimmer-name")
				.classed("stroke",(s,i)=>(i<2))

		leg.filter(s=>(s.distance===0))
				//.selectAll("text:not(.stroke)")
				.selectAll("text")
					.attr("dx",(s,i)=>(i%2)?5:-5)
				    .attr("dy","0.35em")
				    .classed("time",(s,i)=>!(i%2))
					.append("textPath")
				    	.attr("xlink:href", (s,i)=>{
				    		let t=(i%2)?"":"t_"
				    		return `#${t}guide_${s.lane}_${s.distance}`
				    	})
				    	.attr("text-anchor",(s,i)=>((i%2)?"start":"end"))
				    	.attr("startOffset",(s,i)=>((i%2)?"0%":"100%"))
				    	//.style("fill",(s,i)=>(i?"#000":"#336699"))
				    	.text((s,i)=>{
							let swimmer=swimmers_data.find(d=>(d.lane===s.lane))
							if(i%2) {
								return swimmer.entrant.participant.competitor.lastName;
							}
							return swimmer.reaction_time.value;
						})
		leg.filter(s=>(s.distance>0))
			.selectAll("text")
			.data(s=>([s,s]))
			.enter()
			.append("text")
				.attr("class","swimmer-name")
				.classed("stroke",(s,i)=>(i<1))

		leg.filter(s=>(s.distance>0))
				//.selectAll("text:not(.stroke)")
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
							let swimmer=swimmers_data.find(d=>(d.lane===s.lane))
							return swimmer.entrant.participant.competitor.lastName;
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

					goTo(options.text.filter(d=>d.type==="story")[CURRENT_STEP].mt,(d)=>{
						buildTexts();
					})
				})
			.merge(button)
				.classed("replay",d=>(d.toLowerCase()==="replay"))
				.text(d=>d)

	}
	function removeAnnotations() {
		annotations_layer.selectAll("div.annotation").remove();
	}
	function addAnnotation() {
		console.log("addAnnotation",CURRENT_DISTANCE)

		let annotations=options.text.filter(d=>(d.mt===CURRENT_DISTANCE && d.type==="annotation"));

		let annotation=annotations_layer.selectAll("div.annotation").data(annotations);

		console.log("ANNOTATIONS",annotations)

		let xy;
		annotation
			.enter()
			.append("div")
				.attr("class","annotation")
			.merge(annotation)
				.classed("side0",d=>(d.mt%(dimensions.length*2)===0))
				.classed("side1",d=>(d.mt%(dimensions.length*2)>0))
				.style("left",d=>{
					
					let x=xscale(d.lane*dimensions.lane + dimensions.lane/2),
						y=(d.mt%(dimensions.length*2)>0)?yscale(dimensions.length):yscale(0);

					let side=(d.mt%(dimensions.length*2)>0)?1:0;
						
					let overlayPersp=computePerspective(side);
					d.coords=overlayPersp.transform(x,y)
					xy=[x,y];
					console.log("COORDS",d.coords)

					let offset=getOffset(annotations_layer.node());
					console.log("OFFSET",offset)

					console.log("LEFT",(d.coords[0]-offset.left))

					return (d.coords[0]-offset.left)+"px";
				})
				.style("top",d=>{
					let offset=getOffset(annotations_layer.node());
					//console.log("OFFSET",offset,getOffset(this))
					//offset.top=0;
					console.log("TOP",(d.coords[1]-(offset.top)))
					return (d.coords[1]-(offset.top))+"px";
				})
				.html(d=>"<span>"+d.text+"</span>")

		/*annotations_layer.selectAll("div.annotation").append("div")

		svg.append("circle")
				.attr("cx",xy[0])
				.attr("cy",xy[1])
				.attr("r",3)
				.style("fill","#ff0000")*/

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

	function goTo(distance,text_update) {

		removeAnnotations();

		CURRENT_DISTANCE=distance;

		container.classed("end-side",(distance%100>0))

		let selected_leg=leg
			.classed("visible",false)
			.filter(d=>(d.distance===distance))
				.classed("visible",true);
		selected_leg
				.select("path")
					.attr("d",s=>{

						let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
							start_y=(s.distance%(dimensions.length*2)>0)?yscale(0):yscale(dimensions.length),
							dist=s.distance-s.mt,
							y=(s.distance%(dimensions.length*2)>0)?yscale(dimensions.length-dist-10):yscale(dist+10);


						if(s.distance===0) {
							start_y=yscale(0);
							y=start_y;
						}

						s.text_start_y=y;
						return line([
									/*[x-w/2,start_y],
									[x+w/2,start_y],
									[x+w/2,y],
									[x-w/2,y],
									[x-w/2,start_y]*/
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
						return best_cumulative_times[s.distance].best_time*0.2*0.5
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
										/*[x-w/2,start_y],
										[x+w/2,start_y],
										[x+w/2,y],
										[x-w/2,y],
										[x-w/2,start_y]*/
										[x,start_y],
										[x,y],
										[x,start_y]
									]);

						})
						.on("end",d=>{
							if(d.lane===1) {
								if(text_update){
									buildTexts();
									addAnnotation();	
								}
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
					console.log("CSS3 coords",coords)
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
			vscale=options.vscale,
			perspT=options.perspT;

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
								//console.log(p,perspT.transform(p[0],p[1]))
								return perspT.transform(p[0],p[1])
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
									return perspT.transform(p[0],p[1])
								}))
							})
		
}
