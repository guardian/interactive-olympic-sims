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
	extent,
	sum as d3_sum
} from 'd3-array';
import {
	nest
} from 'd3-collection';
import {
	format as d3_format
} from 'd3-format';


import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import {
	convertTimeHMS,
	getDistance
} from '../lib/time';
import {
	dimensions
} from '../lib/running'

export default function LongDistanceRace(data,options) {

	getDistance("8:27.53",51.780)
	getDistance("23:14.73",47.493)
	getDistance("34:43.99",51.650)
	getDistance("50:39.54",52.113)

	

	let split_km={
		"marathon":[
	    	{status:1,km:5},
	    	{status:1,km:10},
	    	{status:1,km:15},
	    	{status:1,km:20},
	    	{status:0,km:42.125/2},
	    	{status:1,km:25},
	    	{status:1,km:30},
	    	{status:1,km:35},
	    	{status:1,km:40},
	    	{status:1,km:42.125}
	    ],
	    "50km_walk":[
	    	{status:1,km:5},
	    	{status:1,km:10},
	    	{status:1,km:15},
	    	{status:1,km:20},
	    	{status:1,km:25},
	    	{status:1,km:30},
	    	{status:1,km:35},
	    	{status:1,km:40},
	    	{status:1,km:45},
	    	{status:1,km:50}
	    ]
	};

	split_km=split_km[options.race];



	let prev_time=0;
    split_km.forEach((d,i)=>{

    	
    	let split_times=data.olympics.eventUnit.result.entrant.map(entrant=>{

    		if(i===split_km.length-1) {
    			return entrant.value || "00:00"
    		}

    		if(!entrant.resultExtension) {
    			entrant.resultExtension={
    				type:"Split Results",
    				extension:[]
    			};
    		}

    		let splits=entrant.resultExtension;

			if(Array.isArray(splits)) {
				splits=splits.find(e=>e.type==="Split Results");
			}
			//console.log(entrant)
			if(!Array.isArray(splits.extension)) {
				splits.extension=[splits.extension];
			}
			
			//splits=splits.extension.concat([{value:d.value || "00:00"}]);

    		return splits.extension[i]?splits.extension[i].value:null;

    	})

    	//console.log(d.km,split_times)

    	d.extent=extent(split_times.filter(d=>{return d && d!=="00:00"}).map(t=>convertTimeHMS(t)))

    	if(d.km===15) {

    		console.log(split_times.filter(d=>{return d && d!=="00:00"}).map(t=>{
    			return t+" => "+convertTimeHMS(t)
    		}))
    	}

    	d.time_extent=d.extent;
    	d.time_diff=d.time_extent[1] - d.time_extent[0];



    	d.prev_time=prev_time;
    	prev_time+=d.time_diff;

    })

    console.log(split_km)

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

		data.olympics.eventUnit.result.entrant.forEach(entrant => {

			let splits=entrant.resultExtension;

			if(Array.isArray(splits)) {
				splits=splits.find(e=>e.type==="Split Results");
			}
			if(!Array.isArray(splits.extension)) {
				splits.extension=[splits.extension];
			}

			if(entrant.value) {
				splits.extension=splits.extension.concat([{
					value:entrant.value,
					position:"10"
				}])	
			}

			let prev={
				time:0,
				km:0,
				value:0
			};
			splits.extension
				.filter((split)=>{
					return split_km[+split.position-1].status
				})
				.forEach(split => {
					split.km=split_km[+split.position-1].km;
					split.time=convertTimeHMS(split.value);
					split.avg_speed=split_km[+split.position-1].km / split.time;
					split.actual_km=split.avg_speed * split_km[+split.position-1].time_extent[0];
					split.str_value=split.value;
					split.status=split_km[+split.position-1].status;
					//console.log(split)

					split.prev_value=prev.value;
					split.time_diff=split.time - prev.time;
					split.dist_diff=split.km - prev.km;
					//split.split_speed=(split.time_diff)/split.dist_diff*100;
					split.split_speed=(split.dist_diff*(60*60*1000))/split.time_diff;
					split.dist_speed=(split.km*(60*60*1000))/split.time;

					split.str_value2=Math.floor(split.time / 1000 / 60) + ":" + ((split.time / 1000) % 60)
					split.time_diff_str=Math.floor(split.time_diff / 1000 / 60) + ":" + ((split.time_diff / 1000) % 60)

					prev.time=split.time;
					prev.km=split.km;
					prev.value=split.value;

				})

			entrant.splits=splits.extension;

		})

		buildVisual();

	}

    function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	select(options.container)
    			.append("h1")
    			.text(options.title);
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","long-distance-race")

	    let svg=container
	    			.append("svg");

	    let box = svg.node().getBoundingClientRect();
	    let WIDTH = options.width || box.width,
	        HEIGHT = options.height || box.height;


	    let xscale=scaleLinear().domain([0,split_km[split_km.length-1].km]).range([0,WIDTH-(margins.left+margins.right)]),
    		yscale=scalePoint().domain(split_km.filter(d=>d.status).map(d=>d.km)).range([HEIGHT-(margins.top+margins.bottom),0]);

    	yscale=scaleLinear().domain([split_km[0].km,split_km[split_km.length-1].km]).range([HEIGHT-(margins.top+margins.bottom),0]);

    	
    	let axes=svg.append("g")
    					.attr("class","axes")
    					.attr("transform",`translate(${margins.left},${margins.top})`);


    	let entrants=svg.append("g")
    					.attr("class","entrants")
    					.attr("transform",`translate(${margins.left},${margins.top})`);

    	let DAY=data.olympics.eventUnit.result.timestamp;

    	let entrant=entrants.selectAll("g.entrant")
    					.data(data.olympics.eventUnit.result.entrant.reverse().filter((d,i)=>{ //.reverse()
    						return 1;
    						return i===0;// || i===20 || i===60
    					}))//.slice(0,2))
    					.enter()
    					.append("g")
    						.attr("class","entrant")
    						.attr("rel",d=>(d.participant.competitor.fullName))
    						.classed("gold",d=>{
								if(!Array.isArray(d.property)) {
									return false;
								}
								return d.property.find(p=>{
									return p.type=="Medal Awarded" && p.value==="Gold"
								})
							})
							.classed("silver",d=>{
								if(!Array.isArray(d.property)) {
									return false;
								}
								return d.property.find(p=>{
									return p.type=="Medal Awarded" && p.value==="Silver"
								})
							})
							.classed("bronze",d=>{
								if(!Array.isArray(d.property)) {
									return false;
								}
								return d.property.find(p=>{
									return p.type=="Medal Awarded" && p.value==="Bronze"
								})
							})

    	let split=entrant.selectAll("g.split")
    						.data(d=>{
    							return d.splits.filter(split => {
    								return split.status;
    							});
    						})
    						.enter()
    						.append("g")
    							.attr("class","split")
    							.attr("rel",d=>d.str_value)
    							.attr("transform",d=>{
    								
    								let x=xscale(d.actual_km),
    									y=yscale(d.km);

    								//console.log(d.km,d)

    								return `translate(${x},${y})`;
    							})

    	split.append("circle")
    			.attr("cx",0)
    			.attr("cy",0)
    			.attr("r",6)
    	split
    		.append("text")
    			.attr("x",0)
    			.attr("y",18)
    			.text(d=>{
    				return d3_format(",.2f")(d.split_speed)+" km/h"
    				
    			})
    	split
    		.append("text")
    			.attr("x",0)
    			.attr("y",32)
    			.text(d=>{
    				return d3_format(",.2f")(d.dist_speed)+" km/h"
    			})
    			// .text(d=>{
    			// 	return d.str_value
    			// })


    	let xaxis=axes.selectAll("g.xaxis")
    			.data(split_km.filter(split=>split.status))
    			.enter()
    			.append("g")
    				.attr("class","xaxis")
    				.attr("transform",d=>{
    								
						let x=0,
							y=yscale(d.km);

						return `translate(${x},${y})`;
					})

    	xaxis.append("line")
    			.attr("x1",0)
    			.attr("y1",0)
    			.attr("x2",WIDTH)
    			.attr("y1",0)

    	xaxis.append("text")
    			.attr("x",-5)
    			.attr("y",0)
    			.attr("dy","0.2em")
    			.text(d=>d.km+"km")


    }


}