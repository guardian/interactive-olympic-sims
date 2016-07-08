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
import {
	line as d3_line
} from 'd3-shape';


import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import {
	convertTimeHMS,
	getDistance
} from '../lib/time';


export default function Triathlon(data,options) {

	console.log("Triathlon",data.olympics.eventUnit.result.entrant);

	let yscales={};

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

    	//2012 fix
    	data.olympics.eventUnit.result.entrant.filter(d=>d.resultExtension).forEach(entrant=>{
    		entrant.resultExtension.forEach(d=>{
				if(!Array.isArray(d.extension)) {
					d.extension=[d.extension];
				}
				d.extension=[{
					value:d.value
				}]
			})
    	})

    	//each entrant has 5 resultExtension. swim,transfer,bike,transfer,run
		data.olympics.eventUnit.result.entrant.filter(d=>d.resultExtension).forEach(entrant => {

			entrant.resultExtension.forEach(d=>{
				if(!Array.isArray(d.extension)) {
					d.extension=[d.extension];
				}	
			})
			


		});

		let flat_data={};
		data.olympics.eventUnit.result.entrant.filter(d=>d.resultExtension).forEach(entrant=>{
			//console.log(entrant)
			entrant.resultExtension.forEach(d=>{
				if(!flat_data[d.type]) {
					flat_data[d.type]=[];
				}
				flat_data[d.type].push(d.extension[d.extension.length-1].value)
			})
		})
		console.log(flat_data)

		let part_extents=function(){
			let extents={};
			for(let key in flat_data) {
				extents[key]=extent(flat_data[key],d=>convertTimeHMS(d))
				yscales[key]=scaleLinear().domain(extents[key])
			}
			return extents;
		}();

		console.log(part_extents)
		
		buildVisual();

	}

	function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	select(options.container)
    			.append("h1")
    			.text(options.title);
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","triathlon")

	    let svg=container
	    			.append("svg");

	    let box = svg.node().getBoundingClientRect();
	    let WIDTH = options.width || box.width,
	        HEIGHT = options.height || box.height;

	    let extents=extent(data.olympics.eventUnit.result.entrant.filter(d=>d.value),d=>{
	    	return convertTimeHMS(d.value)
	    })
	    console.log("extents",extents);

	    let lengths=[1.5,0,40,0,10],
	    	cumulative_lengths=[1.5,1.5,41.5,41.5,51.5];
	    lengths=[33,0,33,0,33];
	    cumulative_lengths=[30,33.5,63.5,67,100]

		let xscale=scaleLinear().domain([0,d3_sum(lengths)]).range([0,WIDTH-(margins.left+margins.right)]),
    		yscale=scaleLinear().domain([0,extents[1]-extents[0]]).range([0,HEIGHT-(margins.top+margins.bottom)]);

    	xscale.domain([0,(extents[1])]);

    	for(let key in yscales) {
    		yscales[key].range([0,HEIGHT-(margins.top+margins.bottom)]);
    	}
    	console.log(yscales)
    	
    	let axes=svg.append("g")
    					.attr("class","axes")
    					.attr("transform",`translate(${margins.left},${margins.top})`);

    	let entrants=svg.append("g")
    					.attr("class","entrants")
    					.attr("transform",`translate(${margins.left},${margins.top})`);

    	let entrant=entrants.selectAll("g.entrant")
    					.data(data.olympics.eventUnit.result.entrant.reverse().filter(d=>d.value).filter((d,i)=>{ //.reverse()
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
    							return d.resultExtension
    						})
    						.enter()
    						.append("g")
    							.attr("class","split")
    							.attr("rel",d=>d.extension[d.extension.length-1].value)
    							.attr("transform",(d,i)=>{
    								let record=d.extension[d.extension.length-1],
    									extent=yscales[d.type].domain();
    								console.log(record.value,convertTimeHMS(record.value),extent[0])
    								//let x=xscale(cumulative_lengths[i]),
    								let x=xscale(convertTimeHMS(record.value)),
    									y=yscale(convertTimeHMS(record.value)-extent[0]);



    								//console.log(d.km,d)
    								record.x=x;
    								record.y=y;

    								return `translate(${x},${y})`;
    							})

    	var line = d3_line()
				    .x(function(d) { return d.x; })
				    .y(function(d) { return d.y; });

    	entrant.append("path")
    				.attr("d",d=>{
    					console.log(d);
    					let points=d.resultExtension.map(r=>{
    						return r.extension[r.extension.length-1];
    					});
    					console.log(points);
    					return line( ([{x:0,y:0}]).concat(points))
    				})

    	split.append("circle")
    			.attr("cx",0)
    			.attr("cy",0)
    			.attr("r",3)
	}

}