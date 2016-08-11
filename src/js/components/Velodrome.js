import {
    select,
    selectAll
} from 'd3-selection';
import {
	dimensions,
	CyclingEasing,
	CyclingLinear
} from '../lib/cycling'
/*import {
	scaleLinear
} from 'd3-scale';*/
import {
	transition
} from 'd3-transition';
import {
	interpolateString
} from 'd3-interpolate';
import {
	arc as d3_arc
} from 'd3-shape';
import {
	convertTime,
	formatSecondsMilliseconds
} from '../lib/time';
import {
	describeArc,
	getAngle,
	toRad
} from '../lib/geometry';

export default function Velodrome(options) {

	//console.log("Oval",options)

	

	let __TEAMS=[];

	

	let multiplier=options.multiplier || 1;

    
	let hundred=options.hundred || 100;

    let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    let svg=options.svg;

    let splits=[];

	let hscale=options.hscale,
		vscale=options.vscale;    

    
    let TEAM_LENGTH=hscale(dimensions.team_length);

    //hscale=vscale.copy();

	let background=svg
					.append("g")
					.attr("class","bg")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	let lane_width=dimensions.lane_width,
		inner_width=lane_width*0.25;
	background
			.append("path")
				.attr("d",addBackground())
				.style("stroke-width",vscale(lane_width))
	background
			.append("path")
				.attr("d",addBackground(-lane_width/2-inner_width/2))
				.attr("class","inner")
				.style("stroke-width",vscale(inner_width))


	let teams=svg
				.append("g")
				.attr("class","teams")
				.attr("transform",`translate(${margins.left},${margins.top})`)

	let ghost=svg
				.append("g")
				.attr("class","ghost-track")
				.attr("transform",`translate(${margins.left},${margins.top})`)

	let ghost_path=ghost
					.append("path")
					.attr("d",addGhostTrack(0))
					.node()

	let ghost_tracks=[
						ghost
							.append("path")
							.attr("id","ghost_team0_0")
							.attr("class","ghost-team")
							.attr("d",addGhostTrack(0))
							.attr("stroke-dasharray",function(d){
								return "0 "+this.getTotalLength();
							}),
						ghost
							.append("path")
							.attr("id","ghost_team1")
							.attr("class","ghost-team")
							.attr("d",addGhostTrack(0))
							.attr("stroke-dasharray",function(d){
								return "0 "+this.getTotalLength();
							})
					];

	let ghosts=[
		ghost.append("g")
				.attr("class","ghost"),
		ghost.append("g")
				.attr("class","ghost")
	];

	ghosts[0].append("circle")
				.attr("class","silver")
				.attr("cx",0)
				.attr("cy",0)
				.attr("r",5/2)
	ghosts[1].append("circle")
				.attr("class","gold")
				.attr("cx",0)
				.attr("cy",0)
				.attr("r",5/2)
	

	let scaffolding=svg
					.append("g")
					.attr("class","scaffolding")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	console.log(dimensions.radius,dimensions.field.width,hscale.domain(),hscale.range())
	scaffolding.append("line")
				.attr("x1",hscale(dimensions.radius+dimensions.field.width/2))
				.attr("y1",-margins.top)
				.attr("x2",hscale(dimensions.radius+dimensions.field.width/2))
				.attr("y2",options.height)
	
	

	function addPath(team,info) {

		let hundreds=[];

		if(!splits[team]) {
			splits[team]=[];
		}

		let curve_length=dimensions.radius*Math.PI;

		console.log(team,"CURVE_LENGTH",curve_length)

		let halves=[
			function(){
				let start={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(0)
					},
					end={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(dimensions.field.height)	
					},
					arc=describeArc(hscale(dimensions.radius),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius),0,180);
				return `M${start.x},${start.y} L${arc.start[0]},${arc.start[1]} ${arc.arc} L${end.x},${end.y}`;
			}(),
			function(){
				let start={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(dimensions.field.height)
					},
					end={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(0)	
					},
					arc=describeArc(hscale(dimensions.radius+dimensions.field.width),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius),180,0);
				return `M${start.x},${start.y} L${arc.start[0]},${arc.start[1]} ${arc.arc} L${end.x},${end.y}`;
			}()
		]

		if(team===1) {
			for(let i=0;i<info.splits.length/2;i++) { //32
				hundreds.push({
					path:halves[1],
					split:info.splits[i]
				});
				hundreds.push({
					path:halves[0],
					split:info.splits[i]
				});
				//hundreds.push(halves[0]);
			}
		}
		if(team===0) {
			for(let i=0;i<info.splits.length/2;i++) { //32
				hundreds.push({
					path:halves[0],
					split:info.splits[i]
				});
				hundreds.push({
					path:halves[1],
					split:info.splits[i]
				});
				//hundreds.push(halves[0]);
				//hundreds.push(halves[1]);
			}
		}
		
		// return [
		// 	hundreds[0] || "",
		// 	hundreds[1] || ""
		// ];
		return hundreds
	}

	

	function addBackground(distance) {
		let lane=2;
		distance = distance || 0;
		let halves=[
			function(){
				let start={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(-lane-distance)
					},
					end={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(dimensions.field.height+lane+distance)	
					},
					arc=describeArc(hscale(dimensions.radius),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius+lane+distance),0,180);
				return `M${start.x},${start.y} L${arc.start[0]},${arc.start[1]} ${arc.arc} L${end.x},${end.y}`;
			}(),
			function(){
				let start={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(dimensions.field.height+lane+distance)
					},
					end={
						x:hscale(dimensions.radius+dimensions.field.width/2),
						y:vscale(-lane-distance)	
					},
					arc=describeArc(hscale(dimensions.radius+dimensions.field.width),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius+lane+distance),180,0);
				return `M${start.x},${start.y} L${arc.start[0]},${arc.start[1]} ${arc.arc} L${end.x},${end.y}`;
			}()
		];

		return halves[0]+halves[1];
		
	}

	function addGhostTrack(distance) {
		let lane=0;
		distance = distance || 0;


		let start={
				x:hscale(dimensions.radius+dimensions.field.width/2),
				y:vscale(-lane-distance)
			},
			end={
				x:hscale(dimensions.radius+dimensions.field.width),
				y:vscale(dimensions.field.height+lane+distance)	
			},
			arc1=describeArc(hscale(dimensions.radius),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius+lane+distance),0,180),
			arc2=describeArc(hscale(dimensions.radius+dimensions.field.width),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius+lane+distance),180,0);

		return `M${start.x},${start.y} L${arc1.start[0]},${arc1.start[1]} ${arc1.arc} L${arc2.start[0]},${arc2.start[1]} ${arc2.arc} L${start.x},${start.y}`;

	}



	this.addTeam = (index,info) => {
		console.log("-------------------------------->",index,info)

		

		__TEAMS.push(info);
		let team=teams
					.append("g")
						.attr("class","team")
						.attr("rel",info.team)

		team
				.selectAll("path")
				.data(addPath(index,info))
				.enter()
				.append("path")
					.attr("d",(d)=>{
						return d.path;
					})
					.attr("id",(d,i)=>("p"+index+"_"+i))
					.classed("gold",d=>{
						if(!Array.isArray(info.entrant.property)) {
							return false;
						}
						return info.entrant.property.filter(p=>{
							return p.type=="Medal Awarded" && p.value==="Gold"
						})[0]
					})
					.classed("silver",d=>{
						if(!Array.isArray(info.entrant.property)) {
							return false;
						}
						return info.entrant.property.filter(p=>{
							return p.type=="Medal Awarded" && p.value==="Silver"
						})[0]
					})
					.classed("bronze",d=>{
						if(!Array.isArray(info.entrant.property)) {
							return false;
						}
						return info.entrant.property.filter(p=>{
							return p.type=="Medal Awarded" && p.value==="Bronze"
						})[0]
					})
		
		team.selectAll("path")
			.attr("stroke-dasharray",function(d){
				return "0 "+this.getTotalLength();
			})
		/*
		//console.log(lane,"SPLITS",lane-1,splits[lane-1])
		
		let split=athlete.selectAll("g.split")
					.data(splits[lane-1])
					.enter()
					.append("g")
						.attr("class","split")
						.attr("transform",(d)=>{
							return `translate(${d[0]},${d[1]})`;
						})
		split.append("circle")
				.attr("r",2)*/


	}
	this.goTo = (split) => {
		teamTransition(0,split)
		teamTransition(1,split)
	}
	this.race = () => {

		//teamTransition(0,0)
		//teamTransition(1,0)

	}
	let CURRENT=[0,0],
		PREV=[0,0];
	function teamTransition(index,split) {

		//console.log(index,split,__TEAMS)

		let time=__TEAMS[index].splits[split].time;


		// if(dimensions.race[options.race]) {
		// 	time=convertTime(dimensions.race[options.race][lane][info.leg]+"");
		// }

		console.log(time,__TEAMS)
		let __TIME=(time?time:info.leg_time)/multiplier;
	  	teams
	  		.selectAll(".team")
	  			.filter((d,i)=>(i===index))
		  		.selectAll("path")
		  			.filter((d,i)=>(i===split))
				  		.transition()
						.duration(__TIME/options.multiplier)
						.ease(!split?CyclingEasing:CyclingLinear)
						.attrTween("stroke-dasharray", function(d){
								console.log(d);
								return tweenDash(this,__TIME,index,d)
						})
						.on("end", function(d,i) {
							//console.log("end",d,i)
							
							if(CURRENT[index]===split) {
								CURRENT[index]++;
								PREV[index]=this;

								if(options.splitCallback) {
									//console.log("SPLIT CALLBACK",index,CURRENT[index],split)
									options.splitCallback(index,split)
								}

								//teamTransition(index,CURRENT[index]);
							}
							
						});
	}
	//console.log(teams.select("path"))
	let totalLength,
		snakeLength = TEAM_LENGTH,//l * 0.05,
    	gap = totalLength - snakeLength;
    let prev_path;
	let ghost_path_length=ghost_tracks[0].node().getTotalLength();

	function tweenDash(path,duration,index,split) {
		return function(t) {

			totalLength=totalLength || path.getTotalLength();
    		let position=totalLength*t;

    		//console.log("tweenDash",split)
			
			//let l2=ghost_path.getTotalLength();
			
			//let ghost_p = ghost_path.getPointAtLength((t*totalLength+l2/2+(l2/2*(1-(index===0?1:0)))+(l2/2*(split%2)))%l2);

			//ghosts[index===0?1:0]
        	//	.attr("transform", "translate(" + ghost_p.x + "," + ghost_p.y + ")");
			
			let dash="0,"+(position)+","+snakeLength+","+totalLength;

			if(position<snakeLength) {
				let interpolate=interpolateString("0," + totalLength, totalLength + "," + totalLength)
				dash=interpolate(t);
			} else if (position>=gap) {
				dash="0,"+(position - snakeLength)+","+snakeLength+","+totalLength;
			} else {
				dash="0,"+(position - snakeLength)+","+snakeLength+","+totalLength;
			}

			if(PREV[index]) {
				let prev_node=PREV[index];
				prev_path=select(PREV[index]);
				if(position > snakeLength) {
					//select(PREV[index])
					prev_path.attr("stroke-dasharray", "0,"+(totalLength)+","+snakeLength+","+totalLength);
					PREV[index]=null;
				} else {
					//console.log("should modifiy prev:",(l*(1-t)),t,totalLength-(l*(1-t)),snakeLength-(totalLength-(l*(1-t))))
					//console.log("0,"+(l*(1-t))+","+snakeLength+","+totalLength)
					let dx=snakeLength-(totalLength-(totalLength*(1-t)))
					//0,1061.9856567382812,55.89398193359375,1117.879638671875
					//select(PREV[index])
					prev_path.attr("stroke-dasharray", "0,"+(totalLength-dx)+","+snakeLength+","+totalLength);
				}

				
			}
			/*
			if(index===0) {
				
				let p=position+(split%2?0:ghost_path_length/2)-TEAM_LENGTH;
				let ghost_dash="0,"+p+","+TEAM_LENGTH+","+ghost_path_length;
				//console.log(split,split%2?ghost_path_length/2:0,ghost_dash)
				//console.log(ghost_dash)
				//let delta=(p+TEAM_LENGTH) - ghost_path_length/2;
				//console.log(delta,"=",(p+TEAM_LENGTH)," - ",ghost_path_length/2)
				//console.log(p,TEAM_LENGTH)
				if(p<0) {

					
					ghost_dash=(TEAM_LENGTH+p)+","+(ghost_path_length-TEAM_LENGTH)+","+(Math.abs(position))
					//console.log(ghost_dash)
				}

				ghost_tracks[0].attr("stroke-dasharray", ghost_dash);
				
			}
			if(index===1) {
				
				let p=position+(split%2?ghost_path_length/2:0)-TEAM_LENGTH;//-TEAM_LENGTH;
				let ghost_dash="0,"+p+","+TEAM_LENGTH+","+ghost_path_length;
				//console.log(position)
				//console.log(split,split%2?ghost_path_length/2:0,ghost_dash)
				//console.log(ghost_dash)
				//let delta=(p+TEAM_LENGTH) - ghost_path_length/2;
				//console.log(delta,"=",(p+TEAM_LENGTH)," - ",ghost_path_length/2)
				//console.log(p,TEAM_LENGTH)
				if(p<0) {
					//ghost_dash=(TEAM_LENGTH+p)+","+(ghost_path_length-TEAM_LENGTH)+","+(Math.abs(position))
					ghost_dash=(TEAM_LENGTH+p)+","+(ghost_path_length-TEAM_LENGTH)+","+Math.abs(TEAM_LENGTH)
					//console.log(ghost_dash)
				}

				ghost_tracks[1].attr("stroke-dasharray", ghost_dash);
				
			}
			*/

			
			//console.log(t,"---->",dash)
            //console.log(dash)
            return dash;
            // return interpolate(t);

            // return interpolate(t);
		}
	}


}