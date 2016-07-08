import {
    select,
    selectAll
} from 'd3-selection';
import {
	scaleLinear
} from 'd3-scale';

import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import Track from './Track';
import Oval from './Oval';
import Runner from './Runner';
import StopWatch from './StopWatch';
import {
	convertTime
} from '../lib/time';
import {
	dimensions
} from '../lib/running'

export default function Running(data,options) {

	let multiplier=options.multiplier || 1;

	let stopWatch=new StopWatch({
		container:options.container,
		multiplier:multiplier
	});

	let runningEvent=select(options.container)
						.append("div")
						.attr("class","running")
	
	options.race=options.race || "400m";

	let oval;

	let frameRequest = requestAnimFrame(function checkInnerHTML(time) {
        ////console.log(time)
        
        if(options.container && options.container.getBoundingClientRect().height) {
            cancelAnimFrame(checkInnerHTML);
           	
            oval=new Oval({
            	race:options.race,
				container:runningEvent.node(),
				margins:{
					top:0,
					bottom:0,
					left:0,
					right:0
				},
				multiplier:multiplier,
				hundred:100
			})
           	

			buildEvent();

            return; 
        }
        frameRequest = requestAnimFrame(checkInnerHTML);
    });

    let timeInfo;
	let position=0;
	let times=[];

    function buildEvent() {

	    data.olympics.eventUnit.result.entrant.forEach((entrant,i)=>{
	    	if(!times[i]) {
    			times[i]=[];
    		}
    		times[i].push(convertTime(entrant.value))
	    })

	    //console.log("TIMES",times)

	    let runners=[],
    		records=[];

		let margins={
			top:5,
			bottom:5,
			left:5,
			right:5
		}

		let entrant=runningEvent.selectAll("div.entrant")
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
			vscale=scaleLinear().domain([0,dimensions.man_height*2]);

		let currently_running=0;
		
		svg
			.each(function(d,i){
				let track=new Track({
						container:this,
						margins:margins,
						dimensions:dimensions,
						scales:{
							h:hscale.copy(),
							v:vscale.copy()
						}
				});
				
				currently_running++;
				
				oval.addRunner(d.order,d)


				runners.push(new Runner(d,{
						race:options.race,
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
						ovalCallback:(info)=>{
							oval.updateRunner(d.order,info);
						},
						endCallback:() => {
							currently_running--;
							//console.log("currently_running",currently_running)
							if(!currently_running) {
								stopWatch.stop();
								//console.log("STOOOOP")
							}
						}
				}));

				

				//track.addOval();

				

			})

		//stopWatch.start();
		runners.forEach(r=>r.run())


	}

	function updateTimeInfo(leg) {

    	timeInfo.text(d=>{
    		////console.log(leg,d);
    		if(leg>0) {
    			let info=d;
	    		return ((getPosition(leg-1,convertTime(info.value)))+1)+" / "+info.value;
    		}
    		
    	})

    }



    function getPosition(leg,time) {
    	return times[leg].indexOf(time);
    }

}