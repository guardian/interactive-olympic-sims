import {
    select,
    selectAll
} from 'd3-selection';
import {
	dimensions,
	dimensions200m,
	ReadyGoEasing,
	RunningLinear,
	Running400mEasing,
	Running200mEasing
} from '../lib/running'
import {
	scaleLinear
} from 'd3-scale';
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
	convertTime
} from '../lib/time';
import {
	describeArc,
	describeInverseArc,
	getAngle,
	toRad,
	polarToCartesian
} from '../lib/geometry';

export default function Oval(options) {

	////console.log("Oval",options)

	

	dimensions.length=options.dimensions.length;
	dimensions.staggers=options.dimensions.staggers;
	

	let addPathFunction={
		"100m":addPath100,
		"200m":addPath200,
		"400m":addPath400
	}

	let multiplier=options.multiplier || 1;

    
	let hundred=options.hundred || 100;

    let margins=options.margins;

    let container=select(options.container)
    					.append("div")
    					.attr("class","oval")



    let box = container.node().getBoundingClientRect();
    let WIDTH = options.width || box.width,
        HEIGHT = options.height || box.height;



    let ratio=(84.39+36.5*2)/73.5;

    HEIGHT=WIDTH/ratio;

    let svg=options.svg || container
								.append("svg")
								.attr("width",WIDTH)
								.attr("height",HEIGHT);

    ////console.log(WIDTH,HEIGHT,ratio,WIDTH/ratio);

    let splits=[];


    let mult=1,
    	mult1=1;

    let internal_cuve_length=(dimensions.radius)*Math.PI*mult;

    let hscale=options.scale.x || scaleLinear().domain([0,dimensions.radius*2+dimensions.field.width]).range([0,WIDTH]),
    	vscale=options.scale.y || scaleLinear().domain([0,dimensions.lanes*2+dimensions.field.height]).range([0,HEIGHT]);

    hscale=vscale.copy();

	let innerBorder=svg
						.append("g")
						.attr("class","inner-border")
						.attr("transform",`translate(${margins.left+hscale(dimensions.lane/2)},${margins.top+vscale(dimensions.lane/2)})`)

	/*innerBorder.append("path")
					.attr("d",()=>{s
						
						return addPath(0);

					});*/
	let background=svg
					.append("g")
					.attr("class","bg")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	let runners=svg
					.append("g")
					.attr("class","runners")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	let scaffolding=svg
					.append("g")
					.attr("class","scaffolding")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	/*scaffolding.append("line")
				.attr("x1",hscale(dimensions.lanes+dimensions.radius)+2)
				.attr("y1",0)
				.attr("x2",hscale(dimensions.lanes+dimensions.radius)+2)
				.attr("y2",HEIGHT)*/
	scaffolding.append("line")
				.attr("x1",hscale(dimensions.lanes+dimensions.radius+dimensions.field.width)+2)
				.attr("y1",0)
				.attr("x2",hscale(dimensions.lanes+dimensions.radius+dimensions.field.width)+2)
				.attr("y2",HEIGHT)

	scaffolding.selectAll("line.stagger")
			.data(dimensions.lane_staggers.map((d,lane)=>{
				let x=dimensions.lanes+dimensions.radius+dimensions.field.width,
					l=lane*dimensions.lane,
					y=dimensions.lanes+dimensions.field.height + l,
					x1=hscale(x),
					y1=vscale.range()[1]/2;
					
				
				let __RADIUS=dimensions.radius+dimensions.running_line[lane]+dimensions.lane*lane+dimensions.lane/2
				
				let angle=getAngle(d-0.2,__RADIUS-dimensions.lane/2);

				////console.log(d,__RADIUS,angle,toRad(angle))
				let coords1=polarToCartesian(x1,y1,hscale(__RADIUS-dimensions.lane),180-angle);
				let coords2=polarToCartesian(x1,y1,hscale(__RADIUS),180-angle);
				////console.log("COORDS",coords)
				return {
					x1:coords1.x,
					y1:coords1.y,
					x2:coords2.x,//hscale(__RADIUS)*Math.sin(toRad(angle))+x1,
					y2:coords2.y//hscale(__RADIUS)*Math.cos(toRad(angle))+y1
				}

			}))
			.enter()
			.append("line")
			.attr("class","stagger")
			.attr("x1",d=>d.x1)
			.attr("y1",d=>d.y1)
			.attr("x2",d=>d.x2)
			.attr("y2",d=>d.y2)


	function setLegRatio() {
		let curves=[];
		for(let i=0;i<8;i++) {
			let r = dimensions.radius+dimensions.lane/2+dimensions.lane*i;

			curves.push((Math.PI * radius)/2);

		}

	}

	function addPath100(lane) {
		lane = lane-1;

		if(!splits[lane]) {
			splits[lane]=[];
		}

		let x=dimensions.lanes+dimensions.radius,
			l=lane*dimensions.lane,
			y=dimensions.lanes+dimensions.field.height + l;

		
		let hundreds=[];		
		let last_coords=[];

		let __RADIUS=dimensions.radius+dimensions.running_line[lane]+dimensions.lane*lane

		//0-100
		//hundreds.push("")
		hundreds.push(`M${hscale(x+dimensions.field.width-hundred)},${vscale(__RADIUS)+vscale.range()[1]/2}
					l${hscale(hundred)},0`);
		
		return [
			hundreds[0] || ""
		];

	}

	this.getPath = (lane) => {
		//lane = lane-1;

		let staggers=dimensions200m.lane_staggers;//.slice();

		if(!splits[lane]) {
			splits[lane]=[];
		}

		let x=dimensions.lanes+dimensions.radius,
			l=lane*dimensions.lane,
			y=dimensions.lanes+dimensions.field.height + l;
		
		let __RADIUS=dimensions.radius+dimensions.running_line[lane]+dimensions.lane*lane

		let curve_length=__RADIUS*Math.PI,
			arc_length=curve_length-staggers[lane];

		////console.log(lane,"CURVE_LENGTH",curve_length,"ARC_LENGTH:",arc_length,"distance to 100",arc_length-100)
		
		let hundreds=[];
		
		let last_coords=[];

		
		//0-100
		let start_angle=getAngle(staggers[lane],__RADIUS),
			end_angle=getAngle(staggers[lane]+100,__RADIUS);
		
		let arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-end_angle,-start_angle);
		
		hundreds.push(`${arc.path}`);
		splits[lane].push(arc.end);

		last_coords={
			curve:1,
			coords:arc.end,
			arc:arc,
			end_angle:end_angle,
			remaining_curve:curve_length-(hundred+staggers[lane])
		};

		//100-200
		let end_arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-180,-end_angle);
			hundreds.push(`${end_arc.arc}L${end_arc.end[0]+hscale(dimensions.field.width)},${end_arc.end[1]}`)
		

		
		
		return hundreds.join("");

		return [
			hundreds[0] || "",
			hundreds[1] || "",
			hundreds[2] || ""
 		];
	}

	this.getPath400 = (lane) => {
		//lane = lane-1;

		return addPath400(lane)

	}

	function addPath200(lane) {
		lane = lane-1;

		let staggers=dimensions200m.lane_staggers.slice();

		if(!splits[lane]) {
			splits[lane]=[];
		}

		let x=dimensions.lanes+dimensions.radius,
			l=lane*dimensions.lane,
			y=dimensions.lanes+dimensions.field.height + l;
		
		let __RADIUS=dimensions.radius+dimensions.running_line[lane]+dimensions.lane*lane

		let curve_length=__RADIUS*Math.PI,
			arc_length=curve_length-staggers[lane];

		//console.log(lane,"CURVE_LENGTH",curve_length,"ARC_LENGTH:",arc_length,"distance to 100",arc_length-100)
		
		let hundreds=[];
		
		let last_coords=[];

		//0-5
		let start_angle=getAngle(staggers[lane],__RADIUS),
			end_angle=getAngle(staggers[lane]+5,__RADIUS);
		
		let arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-end_angle,-start_angle);
		
		hundreds.push(`${arc.path}`);
		splits[lane].push(arc.end);

		last_coords={
			curve:1,
			coords:arc.end,
			arc:arc,
			end_angle:end_angle,
			remaining_curve:curve_length-(hundred+staggers[lane])
		};

		//5-100
		start_angle=end_angle,
		end_angle=getAngle(staggers[lane]+100,__RADIUS);
		
		arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-end_angle,-start_angle);
		
		hundreds.push(`${arc.path}`);
		splits[lane].push(arc.end);

		last_coords={
			curve:1,
			coords:arc.end,
			arc:arc,
			end_angle:end_angle,
			remaining_curve:curve_length-(hundred+staggers[lane])
		};

		//100-200
		let end_arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-180,-end_angle);
			hundreds.push(`${end_arc.path}L${end_arc.end[0]+hscale(dimensions.field.width)},${end_arc.end[1]}`)
		

		return [
			hundreds[0] || "",
			hundreds[1] || "",
			hundreds[2] || ""
 		];

	}

	function addPath400(lane) {

		let staggers=dimensions.lane_staggers.slice();

		//lane = lane-1;

		if(!splits[lane]) {
			splits[lane]=[];
		}

		let x=dimensions.lanes+dimensions.radius,
			l=lane*dimensions.lane,
			y=dimensions.lanes+dimensions.field.height + l,
			angle=staggers[lane]/(dimensions.radius+dimensions.running_line+dimensions.lane*lane)*(180/Math.PI);
		
		let __RADIUS=dimensions.radius+dimensions.running_line[lane]+dimensions.lane*lane
		
		let curve_length=__RADIUS*Math.PI,
			arc_length=curve_length-staggers[lane];

		//console.log(lane,"CURVE_LENGTH",curve_length,"ARC_LENGTH:",arc_length,"distance to 100",arc_length-100)
		
		
		
		let hundreds=[];
		
		let last_coords=[];

		//0-100m
		if(arc_length<hundred) { //100m have a straight part //THIS ARE LANES 6-7-8

			let start_angle=getAngle(staggers[lane],__RADIUS),
				end_angle=180;//getAngle(hundred+dimensions.lane_staggers[lane],__RADIUS);
			
			//console.log(lane,"lane","from",start_angle,"to",end_angle)
			let starting_arc=describeArc(hscale(x+dimensions.field.width),vscale.range()[1]/2,hscale(__RADIUS),180-start_angle,180 - end_angle);
			

			let first_part_100=`${starting_arc.path}`,
				second_part_100=`L${starting_arc.end[0]-hscale(hundred-arc_length)},${starting_arc.end[1]}`;
			hundreds.push(first_part_100+second_part_100);

			//hundreds.push("");
			splits[lane].push([starting_arc.end[0]-hscale(hundred-arc_length),starting_arc.end[1]]);

			last_coords={
							curve:0,
							coords:[
								starting_arc.end[0]-hscale(hundred-arc_length),
								starting_arc.end[1]
							],
							last_straight:hundred-arc_length
						};

		} else {
			
			let start_angle=getAngle(staggers[lane],__RADIUS),
				end_angle=getAngle(hundred+staggers[lane],__RADIUS);
			
			////console.log(lane,"lane","from",start_angle,"to",end_angle)
			let starting_arc=describeArc(hscale(x+dimensions.field.width),vscale.range()[1]/2,hscale(__RADIUS),180-start_angle,180 - end_angle);
			
			//hundreds.push("")
			hundreds.push(`M${starting_arc.start[0]},${starting_arc.start[1]}${starting_arc.arc}`);
			
			splits[lane].push(starting_arc.end);

			last_coords={
				curve:1,
				coords:starting_arc.end,
				arc:starting_arc,
				end_angle:end_angle,
				remaining_curve:curve_length-(hundred+staggers[lane])
			};
		}

		let second_arc_length,
			second_arc;
		
		//100-200m
		
		if(!last_coords.curve) { //THIS ARE LANES 6-7-8
			

			let start=`L${last_coords.coords[0]},${last_coords.coords[1]}`,
				straight_part_after_curve_in_first_100=last_coords.last_straight,
				straight_part=dimensions.field.width - straight_part_after_curve_in_first_100,
				first_part_100=`L${hscale(x)},${last_coords.coords[1]}`;

			let second_arc_length=hundred-straight_part;
			
			let end_angle=getAngle(second_arc_length,__RADIUS);///(dimensions.radius+dimensions.lane/2+dimensions.lane*lane)*(180/Math.PI);

			//
			////console.log(lane,"ANGLE2 IS",angle2)
			////console.log("THE SECOND PART TO THE CURVE IS",l,"SO THE SECOND ARC IS",second_arc_length,"=>",angle2,"deg")
			let second_arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-end_angle,0);
			last_coords={
				curve:1,
				coords:second_arc.end,
				arc:second_arc,
				end_angle:end_angle,
				curve_length:second_arc_length
			};
			
			
			hundreds.push(start+first_part_100+second_arc.arc)
			
			splits[lane].push(second_arc.end);
			
		} else {
			
			
			let first_arc_length=last_coords.remaining_curve;
			
			//let start_angle=first_arc_length/(__RADIUS)*(180/Math.PI);
			
			let first_arc=describeArc(hscale(x+dimensions.field.width),vscale.range()[1]/2,hscale(__RADIUS),180-last_coords.end_angle,0);
			
			let straight_part_after_curve_in_second_100=hundred-first_arc_length,
				delta_straight_part=straight_part_after_curve_in_second_100-dimensions.field.width;
			if(lane===0) {
				//console.log("-------------------------")
				//console.log(last_coords.remaining_curve)
				//console.log(straight_part_after_curve_in_second_100,dimensions.field.width)
				//console.log("-------------------------")
			}
			let straight=`L${hscale(x - (delta_straight_part>0?0:delta_straight_part))},${first_arc.end[1]}`,
				second_arc={arc:""}

			last_coords={
					curve:0,
					coords:[hscale(x - (delta_straight_part>0?0:delta_straight_part)),first_arc.end[1]],
					arc:null,
					end_angle:0,
					curve_length:0,
					left2border:0//Math.abs(delta_straight_part)
				}

			//console.log(lane,"--------------->",delta_straight_part)
			if(delta_straight_part>0) {
				
				let end_angle=delta_straight_part/(__RADIUS)*(180/Math.PI);
			
				second_arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-end_angle,0);
				
				last_coords={
					curve:1,
					coords:second_arc.end,
					arc:second_arc,
					end_angle:end_angle,
					curve_length:delta_straight_part
				}
			}
			
			hundreds.push(`L${first_arc.start[0]},${first_arc.start[1]}${first_arc.arc}${straight}${second_arc.arc}`);	
			splits[lane].push(last_coords.coords);
		}


		

		let remaining_curve = curve_length-last_coords.curve_length;
		let running_curve=remaining_curve>hundred?hundred:remaining_curve;
		
		running_curve=running_curve - (last_coords.left2border||0);

		
		//200-300m
		//console.log("200-300m",lane,last_coords)
		
		// let angle3=(running_curve)/(dimensions.radius+dimensions.lane/2+dimensions.lane*lane)*(180/Math.PI);
		// angle3=angle3+last_coords.angle;

		//let end_angle=getAngle(last_coords.curve_length+hundred-(last_coords.left2border||0),__RADIUS),//last_coords.end_angle;
		let end_angle=getAngle(last_coords.curve_length+hundred,__RADIUS),
			third_arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-(end_angle),-last_coords.end_angle);
		//if(lane===0) {
			//console.log(lane,"LAST COORDS",last_coords)
			//console.log("REMAINING CURVE",remaining_curve)
			//console.log("running_curve",running_curve,"--->",second_arc_length)
			////console.log("WHOLE ARC",(hundred+remaining_curve+(last_coords.left2border||0)))
			////console.log("ANGLE3",angle3)
			let straight_part="";
			if(last_coords.left2border) {
				straight_part=`L${hscale(x)},${last_coords.coords[1]}`;
			}
			hundreds.push(`L${last_coords.coords[0]},${last_coords.coords[1]}${straight_part}${third_arc.arc}`)	
			
			splits[lane].push(third_arc.end);
		//}
		
		//300-400m
		
			let fourth_arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),-180,-end_angle);
			hundreds.push(`L${third_arc.end[0]},${third_arc.end[1]}${fourth_arc.arc}L${fourth_arc.end[0]+hscale(dimensions.field.width)},${fourth_arc.end[1]}`)
		

		

		
		

		return [
			//starting_arc.path,
			hundreds[0] || "",
			hundreds[1] || "",
			hundreds[2] || "",
			hundreds[3] || ""
			//`M${starting_arc.end[0]},${starting_arc.end[1]}L${hscale(x)} ${starting_arc.end[1]}`,
			//`M${hscale(x)},${starting_arc.end[1]} ${ending_arc.arc}`,
			//`M${ending_arc.end[0]},${ending_arc.end[1]} L${hscale(x+dimensions.field.width)},${ending_arc.end[1]}`
		];

		// let starting_arc=describeArc(hscale(x+dimensions.field.width),vscale(dimensions.field.start.y+dimensions.lanes),hscale(dimensions.radius+dimensions.lane/2+dimensions.lane*lane),180-angle,0),
		// 	ending_arc=describeArc(hscale(x),vscale(dimensions.field.start.y+dimensions.lanes),hscale(dimensions.radius+dimensions.lane/2+dimensions.lane*lane),0,180);

		return [`${starting_arc.path}
						L${hscale(x)},${starting_arc.end[1]}
						${ending_arc.arc}
						L${hscale(x+dimensions.field.width)},${ending_arc.end[1]}`];
		/*
		return `${starting_arc.path}
				L${hscale(x)},${vscale(dimensions.lanes-l)}
				A${hscale(dimensions.radius+l)},${vscale(dimensions.radius+l)},0,0,0,${hscale(x)},${vscale(y)}
				L${hscale(x+dimensions.field.width)},${vscale(y)}`

		return `M${hscale(x)},${vscale(y)}
				L${hscale(x+dimensions.field.width)},${vscale(y)}
				A${hscale(dimensions.radius+l)},${vscale(dimensions.radius+l)},0,0,0,${hscale(x+dimensions.field.width)},${vscale(dimensions.lanes-l)}
				L${hscale(x)},${vscale(dimensions.lanes-l)}
				A${hscale(dimensions.radius+l)},${vscale(dimensions.radius+l)},0,0,0,${hscale(x)},${vscale(y)}`
		*/
			
	}

	function addBackground(lane,antiClockWise=false) {

		lane = lane-1;
		
		let __RADIUS=dimensions.radius+dimensions.running_line[lane]+dimensions.lane*lane;
		
		let staggers=dimensions.lane_staggers.slice();
		if(options.race==="200m") {
			staggers=dimensions200m.lane_staggers.slice();
		}

		////console.log("STAGGERS",options.race,staggers)

		let x=dimensions.lanes+dimensions.radius,
			l=lane*dimensions.lane,
			y=dimensions.lanes+dimensions.field.height + l,
			angle=staggers[lane]/(dimensions.radius+dimensions.lane/2+dimensions.lane*lane)*(180/Math.PI);

		if(antiClockWise) {
			let start_angle=getAngle(staggers[lane],__RADIUS)
			start_angle=0;
			
			let starting_arc=describeInverseArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),180,0),
				ending_arc=describeInverseArc(hscale(x+dimensions.field.width),vscale.range()[1]/2,hscale(__RADIUS),0,180);

			return `M${hscale(x+dimensions.field.width)},${starting_arc.start[1]}
					L${hscale(x)},${starting_arc.start[1]}
					${starting_arc.arc}
					L${hscale(x+dimensions.field.width)},${starting_arc.end[1]}
					${ending_arc.arc}`;
		} else {
			let start_angle=getAngle(staggers[lane],__RADIUS)
			start_angle=0;
			
			let starting_arc=describeArc(hscale(x+dimensions.field.width),vscale.range()[1]/2,hscale(__RADIUS),180,0),
				ending_arc=describeArc(hscale(x),vscale.range()[1]/2,hscale(__RADIUS),0,180);
			////console.log("BG BG BG BG",starting_arc)

			////console.log("RADIUS",lane,__RADIUS,hscale(__RADIUS),ending_arc.start[1])

			return `M${hscale(x+dimensions.field.width)},${starting_arc.start[1]}
					${starting_arc.arc}
					L${hscale(x)},${starting_arc.end[1]}
					${ending_arc.arc}
					L${hscale(x+dimensions.field.width)},${ending_arc.end[1]}`;
		}
		
		
		return `${starting_arc.path}`
				/*L${hscale(x)},${starting_arc.end[1]}
				${ending_arc.arc}
				L${hscale(x+dimensions.field.width)},${ending_arc.end[1]}
				`;*/

		
	}

	this.getRatios = () => {
		let lane_ratios=[],
			inner_lane=background.select("#bg_1").node().getTotalLength();

		for(let l=0;l<8;l++) {
			let current_lane=background.select(`#bg_${l+1}`).node().getTotalLength();
			lane_ratios[l]=inner_lane/current_lane;
		}
		return lane_ratios;
	}

	this.addRunner = (ath) => {
		////console.log("-------------------------------->","adding runner at lane",lane)

		let lane=ath.entrant.order,
			runner=ath.entrant;

		background
				.append("g")
				.attr("class","background")
				.append("path")
					.attr("d",addBackground(lane,true))
					.attr("id","bg_o_"+lane)
					//.style("stroke-width",hscale(dimensions.lane))
					.style("stroke-width",hscale(dimensions.lane-dimensions.line_width*1)*1);



		background
				.append("g")
				.attr("class","background")
				.append("path")
					.attr("d",addBackground(lane))
					.attr("id","bg_"+lane)
					//.style("stroke-width",hscale(dimensions.lane))
					.style("stroke-width",1)


		/*
		let athlete=runners
						.append("g")
							.attr("class","runner");

		athlete
				.selectAll("path")
				.data(addPathFunction[options.race](lane))
				.enter()
				.append("path")
					.attr("d",(d)=>{
						return d;//addPath(lane)
					})
					.attr("id",(d,i)=>("p"+lane+"_"+i))
					.style("stroke-width",hscale(dimensions.lane-dimensions.line_width*2)*0.9)
					.classed("gold",d=>{
						if(!Array.isArray(runner.property)) {
							return false;
						}
						return runner.property.find(p=>{
							return p.type=="Medal Awarded" && p.value==="Gold"
						})
					})
					.classed("silver",d=>{
						if(!Array.isArray(runner.property)) {
							return false;
						}
						return runner.property.find(p=>{
							return p.type=="Medal Awarded" && p.value==="Silver"
						})
					})
					.classed("bronze",d=>{
						if(!Array.isArray(runner.property)) {
							return false;
						}
						return runner.property.find(p=>{
							return p.type=="Medal Awarded" && p.value==="Bronze"
						})
					})
		
		athlete.selectAll("path")
			.attr("stroke-dasharray",function(d){
				return "0 "+this.getTotalLength();
			})
		
		////console.log(lane,"SPLITS",lane-1,splits[lane-1])
		
		let split=athlete.selectAll("g.split")
					.data(splits[lane-1])
					.enter()
					.append("g")
						.attr("class","split")
						.attr("transform",(d)=>{
							return `translate(${d[0]},${d[1]})`;
						})
		split.append("circle")
				.attr("r",2)
		*/

	}

	this.updateRunner = (ath,info) => {
		laneTransition(ath,info);
		////console.log(lane,info)
	}

	function laneTransition(ath,info) {

		let lane = ath.entrant.order-1;
		let time=info.leg_time;

		if(dimensions.race[options.race]) {
			time=convertTime(dimensions.race[options.race][lane][info.leg]+"");
		}

		////console.log(lane,time)

	  	runners
	  		.selectAll(".runner")
	  			.filter((d,i)=>(i===lane))
		  		.selectAll("path")
		  			.filter((d,i)=>(i===info.leg))
				  		.transition()
						.duration((time?time:info.leg_time)/multiplier)
						.ease(info.leg===0?Running200mEasing:RunningLinear)
						.attrTween("stroke-dasharray", function(d){return tweenDash(this)})

	}

	function tweenDash(path) {
		return function(t) {

			let l=path.getTotalLength();



			let interpolate = interpolateString("0," + l, l + "," + l);

			let p = path.getPointAtLength(t * l);

            //athlete
            //	.attr("transform", "translate(" + p.x + "," + p.y + ")")            
            
            return interpolate(t);
		}
	}
}