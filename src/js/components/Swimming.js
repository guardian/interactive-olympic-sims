import {
    select,
    selectAll
} from 'd3-selection';
import {
	scaleLinear
} from 'd3-scale';

import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import SwimmingPool from './SwimmingPool';
import Swimmer from './Swimmer';
import Record from './Record';
import StopWatch from './StopWatch';
import {
	convertTime
} from '../lib/time';
import {
	dimensions
} from '../lib/swimming'

export default function Swimming(data,options) {

	let multiplier=options.multiplier || 1;

	let stopWatch=new StopWatch({
		container:options.container,
		multiplier:multiplier
	});
	

	let swimmingEvent=select(options.container)
						.append("div")
						.attr("class","swimming")

	let frameRequest = requestAnimFrame(function checkInnerHTML(time) {
        //console.log(time)
        
        if(options.container && options.container.getBoundingClientRect().height) {
            cancelAnimFrame(checkInnerHTML);
           	buildEvent();
            return; 
        }
        frameRequest = requestAnimFrame(checkInnerHTML);
    });

    let timeInfo;
	let position=0;
	let times=[];

    function buildEvent() {

    	

	    data.olympics.eventUnit.result.entrant.forEach((entrant)=>{
	    	entrant.resultExtension[1].extension.forEach((leg,i)=>{
	    		if(!times[i]) {
	    			times[i]=[];
	    		}
	    		times[i].push(convertTime(leg.value))
	    	})
	    })

	    console.log("TIMES",times)

	    //return;

    	let swimmers=[],
    		records=[];

		let margins={
			top:5,
			bottom:5,
			left:5,
			right:5
		}

		let entrant=swimmingEvent.selectAll("div.entrant")
					.data(data.olympics.eventUnit.result.entrant.sort((a,b)=>{return +a.order - +b.order}))//.slice(0,1))
					.enter()
					.append("div")
						.attr("class","entrant")

		entrant.append("div")
					.attr("class","info")
					.text(d=>{
						return d.participant.competitor.fullName+" - "+d.country.identifier;
					})

		let svg=entrant.append("svg");

		timeInfo=entrant.append("div")
					.attr("class","time-info");

		

		let hscale=scaleLinear().domain([0,dimensions.length+dimensions.block*2]),
			vscale=scaleLinear().domain([0,dimensions.step+dimensions.depth+dimensions.man_height]);

		let currently_swimming=0;
		
		

		svg
			.each(function(d){
				let swimmingPool=new SwimmingPool({
						container:this,
						margins:margins,
						dimensions:dimensions,
						scales:{
							h:hscale.copy(),
							v:vscale.copy()
						}
				});
				
				currently_swimming++;
				
				swimmers.push(new Swimmer(d,{
						container:this,
						margins:margins,
						dimensions:dimensions,
						scales:{
							h:hscale.copy(),
							v:vscale.copy()
						},
						multiplier:multiplier,
						callback:(leg)=>{
							updateTimeInfo(leg);
							position++;
						},
						endCallback:() => {
							currently_swimming--;
							console.log("currently_swimming",currently_swimming)
							if(!currently_swimming) {
								stopWatch.stop();
								console.log("STOOOOP")
							}
						}
				}));

				swimmingPool.addWater();

				// records.push(new Record(options.record,{
				// 	container:this,
				// 		margins:margins,
				// 		dimensions:dimensions,
				// 		scales:{
				// 			h:hscale.copy(),
				// 			v:vscale.copy()
				// 		},
				// 		multiplier:multiplier
				// }));

			})

		stopWatch.start();
		swimmers.forEach(s=>s.swim())
		
    }

    function updateTimeInfo(leg) {

    	timeInfo.text(d=>{
    		console.log(leg,d);
    		if(leg>0) {
    			let info=d.resultExtension[1].extension[leg-1];
	    		return ((getPosition(leg-1,convertTime(info.value)))+1)+" / "+info.value+ " / "+(leg*50)+"m";
    		}
    		
    	})

    }



    function getPosition(leg,time) {
    	return times[leg].indexOf(time);
    }
	

}