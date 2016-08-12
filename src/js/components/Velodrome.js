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

	let ts=[]; //timeouts

    
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
				.attr("d",addBackground(-lane_width/2-inner_width/2+0.9))
				.attr("class","inner")
				.style("stroke-width",vscale(inner_width))

	background
			.append("path")
				.attr("d",addBackground(-lane_width/4-0.6))
				.attr("class","inner-line")

	background
			.append("path")
				.attr("d",addBackground(-lane_width/4+1))
				.attr("class","middle-line")
	
	background
			.append("path")
				.attr("d",addBackground(2))
				.attr("class","outer-line")
				


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
							.style("stroke-dasharray",function(d){
								return "0 "+this.getTotalLength();
							}),
						ghost
							.append("path")
							.attr("id","ghost_team1")
							.attr("class","ghost-team")
							.attr("d",addGhostTrack(0))
							.style("stroke-dasharray",function(d){
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

	function addTeamPath(index=0) {
		let lane=0;
		


		let start={
				x:hscale(dimensions.radius+dimensions.field.width/2),
				y:vscale(-lane + dimensions.field.height*index)
			},
			end={
				x:hscale(dimensions.radius+dimensions.field.width),
				y:vscale(dimensions.field.height + lane -dimensions.field.height*index)	
			},
			arc1=describeArc(hscale(dimensions.radius),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius+lane+dimensions.field.height*index),0,180),
			arc2=describeArc(hscale(dimensions.radius+dimensions.field.width),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius+lane+dimensions.field.height*index),180,0);

		if(index) {
			arc1=describeArc(hscale(dimensions.radius+dimensions.field.width),vscale(dimensions.radius),vscale(dimensions.radius+lane),180,0);
			arc2=describeArc(hscale(dimensions.radius),vscale(0)+vscale(dimensions.radius),vscale(dimensions.radius+lane),0,180);
		}
		//console.log(arc1)

		return `M${start.x},${start.y} L${arc1.start[0]},${arc1.start[1]} ${arc1.arc} L${arc2.start[0]},${arc2.start[1]} ${arc2.arc} L${start.x},${start.y}
					L${arc1.start[0]},${arc1.start[1]} ${arc1.arc} L${arc2.start[0]},${arc2.start[1]} ${arc2.arc} L${start.x},${start.y}
					L${arc1.start[0]},${arc1.start[1]} ${arc1.arc} L${arc2.start[0]},${arc2.start[1]} ${arc2.arc} L${start.x},${start.y}`;
		/* ${arc1.arc} L${arc2.start[0]},${arc2.start[1]} ${arc2.arc} L${start.x},${start.y}
				L${arc1.start[0]},${arc1.start[1]} ${arc1.arc} L${arc2.start[0]},${arc2.start[1]} ${arc2.arc} L${start.x},${start.y}
				L${arc1.start[0]},${arc1.start[1]} ${arc1.arc} L${arc2.start[0]},${arc2.start[1]} ${arc2.arc} L${start.x},${start.y}
				`;*/		
	}

	this.addTeam = (index,info) => {
		console.log("-------------------------------->",index,info)

		

		__TEAMS.push(info);
		let team=teams
					.append("g")
						.attr("class","team")
						.attr("rel",info.team)
		//console.log("###############",addTeamPath(index))
		team
			.append("path")
				.attr("class","team-track")
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
				.attr("d",addTeamPath(index))
				.style("stroke-dasharray",function(d){
					return "0 "+this.getTotalLength();
				})

		team
			.append("path")
				.attr("class","team-gap")
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
				.attr("d",addTeamPath(index))
				.style("stroke-dasharray",function(d){
					return "0 "+this.getTotalLength();
				})

		/*team
				.selectAll("path.split")
				.data(addPath(index,info))
				.enter()
				.append("path")
					.attr("class","split")
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
		
		team.selectAll("path.split")
			.attr("stroke-dasharray",function(d){
				return "0 "+this.getTotalLength();
			})*/
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
	this.goTo = (distance) => {
		teamTransition(0,distance)
		teamTransition(1,distance)
	}
	this.goFromTo = (from,to=4) => {
		console.log("GO FROM TO",from,to)
		ts.forEach(t=>(clearTimeout(t)));

		let __to = +from+(dimensions.length/1000/2);
		teamTransition(0,from,__to,to);
		teamTransition(1,from,__to,to)	
	}
	this.goFrom = (from) => {
		let to = from+(dimensions.length/1000/2);
		teamTransition(0,from,to);
		teamTransition(1,from,to);
	}
	this.cancelTransitions = () =>{
		console.log("cancel transitions")
		ts.forEach(t=>(clearTimeout(t)));
		teams.selectAll("path").style("transition","none")
	}
	this.race = () => {

		//teamTransition(0,0)
		//teamTransition(1,0)

	}


	let CURRENT=[0,0],
		PREV=[0,0];
	let totalLength,
		ovalLength,
		snakeLength = TEAM_LENGTH,//l * 0.05,
    	gap = totalLength - snakeLength,
    	TRACK_LENGTH=dimensions.length/1000;
    let prev_path;
	let ghost_path_length=ghost_tracks[0].node().getTotalLength();

	function teamTransition(index,from,to,end_at=4,delay=100) {

		console.log("teamTransition",index,from,to,__TEAMS[index])

		let splitFrom=__TEAMS[index].splits.filter(d=>d.distance===from)[0],
			splitTo=__TEAMS[index].splits.filter(d=>d.distance===to)[0];
		


		console.log("FROM",splitFrom);
		console.log("TO",splitTo);

		let __TIME=splitTo.time - splitTo.dt;


		// if(dimensions.race[options.race]) {
		// 	time=convertTime(dimensions.race[options.race][lane][info.leg]+"");
		// }

		console.log(__TIME,__TEAMS)
		
		
		let track_path=teams
				  		.selectAll(".team")
				  			.filter((d,i)=>(i===index))
				  			.select("path.team-track");

		track_path.style("transition",`none`);

		teams.selectAll("path.team-gap")
			.style("transition",`none`)
			.style("stroke-dasharray",function(d){
				return "0 "+this.getTotalLength();
			})

	  	track_path
	  			.style("stroke-dasharray", function(d){

	  					let is2ndHalf=((splitTo.distance%1)/0.125)%2

						//console.log("from",splitFrom,tweenTeamTrack(this,__TIME,index,splitFrom,is2ndHalf)(0))
						//console.log("to",splitTo,tweenTeamTrack(this,__TIME,index,splitTo,is2ndHalf)(0))



						return tweenTeamTrack(this,__TIME,index,splitFrom,is2ndHalf)(0)
				})
				.transition()
				.duration(0)
				.delay(delay)
				.on("end",()=>{
					track_path
							.style("transition",`stroke-dasharray ${__TIME/options.multiplier}ms ${splitFrom.distance===0?"cubic-bezier(.52,.04,.8,.8)":"linear"}`)
							.style("stroke-dasharray", function(d){
									splitTo.strokedasharray=tweenTeamTrack(this,__TIME,index,splitTo,true)(0);
									return splitTo.strokedasharray;
							})
							.on("transitionend",()=>{
								if(splitTo.distance<end_at) {
									teamTransition(index,splitFrom.distance+TRACK_LENGTH/2,splitTo.distance+TRACK_LENGTH/2,end_at,0);
								} else {
									if(splitTo.dmt>0) {
										teamGapTransition(index,splitTo)	
									}
								}

								if(options.splitCallback) {
									ts[index]=setTimeout(()=>{
												options.splitCallback(index,splitTo.index)	
											},splitTo.dt_cumulative/multiplier)
									
								}
							})
				})
				
	  	

		/*setTimeout(()=>{
			track_path.style("transition",`stroke-dasharray ${__TIME/options.multiplier}ms ${splitFrom.distance===0?"cubic-bezier(.52,.04,.8,.8)":"linear"}`);

			track_path
					.style("stroke-dasharray", function(d){
							return tweenTeamTrack(this,__TIME,index,splitTo,true)(0)
					})
					.on("transitionend",()=>{
						if(splitTo.distance<end_at) {
							teamTransition(index,splitFrom.distance+TRACK_LENGTH/2,splitTo.distance+TRACK_LENGTH/2,end_at,0);
						}
					})
		},delay)*/
		

				/*
				.transition()
				.duration(__TIME/options.multiplier)
				.ease(!splitFrom.time?CyclingEasing:CyclingLinear)
				.attr("stroke-dasharray", function(d){
						//console.log("T!O",__TIME,index,splitTo,tweenTeamTrack(this,__TIME,index,splitTo)(0))
						return tweenTeamTrack(this,__TIME,index,splitTo,true)(0)
				})
				.on("end", function(d,i) {
					//console.log("end",d,i)
					
					// if(CURRENT[index]===index) {
					// 	CURRENT[index]++;
					// 	PREV[index]=this;

					// 	if(options.splitCallback) {
					// 		//console.log("SPLIT CALLBACK",index,CURRENT[index],split)
					// 		//options.splitCallback(index,split)
					// 	}

					// 	teamTransition(index,splitFrom.distance+TRACK_LENGTH/2+splitTo.distance+TRACK_LENGTH/2);
					// }
					if(splitTo.distance<end_at) {
						teamTransition(index,splitFrom.distance+TRACK_LENGTH/2,splitTo.distance+TRACK_LENGTH/2,end_at);
					}
				});
				*/
				/*.attrTween("stroke-dasharray", function(d){
						//console.log(d);
						return tweenTeamTrack(this,__TIME,index,splitTo)
				})*/
		  		/*.selectAll("path")
		  			.filter((d,i)=>(i===split))
		  				.attr("stroke-dasharray", function(d){
								console.log(d,__TIME,index);
								console.log("!!!!!",tweenDash(this,__TIME,index,d)(0.01))
								return tweenDash(this,__TIME,index,d)(0.01)
						})*/
		  				/*
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
						*/
	}
	//console.log(teams.select("path"))
	function teamGapTransition(index,split) {
		console.log("teamGapTransition",index,split);

		let gap_path=teams
				  		.selectAll(".team")
				  			.filter((d,i)=>(i===index))
				  			.select("path.team-gap");

		
		let is2ndHalf=((split.distance%1)/0.125)%2


		gap_path
			.style("transition",`none`)

		gap_path
			.style("stroke-dasharray",()=>{
				let dash=split.strokedasharray.split(",");
				dash[1]= +dash[1] + (+dash[2]);
				dash[2]=10;
				split.strokedasharray=dash.join(",");
				return dash.join(",");
			})
			.transition()
			.duration(0)
			.on("end",()=>{
				gap_path
						.style("transition",`stroke-dasharray ${split.dt_cumulative/options.multiplier}ms linear`)
						.style("stroke-dasharray", function(d){
								
								let dash=split.strokedasharray.split(",");

								let oval_part=split.distance%TRACK_LENGTH;
			
								let startPoint=ovalLength + (oval_part>0?ovalLength/2:0)*(is2ndHalf?1:-1) ; //get the middle oval + part of the oval

								//console.log("GAP ovalLength",ovalLength)
								//console.log("GAP startPoint",startPoint)

								let p=startPoint + (ovalLength);

								//let dash=`0,${p-TEAM_LENGTH},${TEAM_LENGTH},${totalLength}`;


								dash[2]=(ovalLength+(is2ndHalf?ovalLength/2:0)) - (+dash[1]);

								//console.log("GAP NEW DASH",dash)

								return dash.join(",");

						})
						.on("transitionend",()=>{
							console.log("GAP CLOSED")
						})
			})


	}

	function tweenTeamTrack(path,duration,index,split,is2ndHalf) {
		return function(t) {
			totalLength=totalLength || path.getTotalLength();
			ovalLength=totalLength/3;

			let oval_part=split.distance%TRACK_LENGTH;
			
			let startPoint=ovalLength + (oval_part>0?ovalLength/2:0)*(is2ndHalf?1:-1) ; //get the middle oval + part of the oval

			let delta=split.dmt/TRACK_LENGTH;

			//console.log("ovalLength",ovalLength)
			//console.log("startPoint",startPoint)

			let p=startPoint + (ovalLength)*t - ovalLength*delta;

			let dash=`0,${p-TEAM_LENGTH},${TEAM_LENGTH},${totalLength}`;

			return dash;
		}
	}
	function tweenTeamGap(path,split) {
		totalLength=totalLength || path.getTotalLength();
		ovalLength=totalLength/3;

		let oval_part=split.distance%TRACK_LENGTH;
		//console.log("OVAL PART",oval_part)
		let startPoint=ovalLength + (oval_part>0?ovalLength/2:0)*(is2ndHalf?1:-1) ; //get the middle oval + part of the oval

		let delta=split.dmt/TRACK_LENGTH;

		console.log("ovalLength",ovalLength)
		console.log("startPoint",startPoint)

		let p=startPoint + (ovalLength)*t - ovalLength*delta;

		let dash=`0,${p-TEAM_LENGTH},${TEAM_LENGTH},${totalLength}`;

		return dash;
	}
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
					prev_path.style("stroke-dasharray", "0,"+(totalLength)+","+snakeLength+","+totalLength);
					PREV[index]=null;
				} else {
					//console.log("should modifiy prev:",(l*(1-t)),t,totalLength-(l*(1-t)),snakeLength-(totalLength-(l*(1-t))))
					//console.log("0,"+(l*(1-t))+","+snakeLength+","+totalLength)
					let dx=snakeLength-(totalLength-(totalLength*(1-t)))
					//0,1061.9856567382812,55.89398193359375,1117.879638671875
					//select(PREV[index])
					prev_path.style("stroke-dasharray", "0,"+(totalLength-dx)+","+snakeLength+","+totalLength);
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