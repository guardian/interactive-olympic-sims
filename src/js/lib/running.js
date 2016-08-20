import {
	bezier
} from './bezier';
import {
	range
} from 'd3-array';
import {
	getArcLength,
	getAngle
} from './geometry';

export const ReadyGoEasing=bezier(0.5,0.1,0.8,0.8); //using http://cubic-bezier.com/ to calculate parameters
export const RunningLinear=bezier(0.5,0.5,0.5,0.5);
export const Running400mEasing=bezier(0.05,0.1,0.07,0.07)

export const Running200mEasing=bezier(0.32,0.05,0.23,0.23)

export const Running4x100mChangeEasing=bezier(.23,.20,.38,.38)


export const dimensions = {
	field:{
		width:84.39,
		height:73.0,
		start:{
			x:36.50,
			y:73.0/2
		}
	},
	length:400,
	radius:36.50,
	lane:1.22,
	lanes:9.76,
	lanes_n:7,
	line_width:0.05,
	man_height:1.8,
	block:2,
	//running_line:[0.3,0.2,0.2,0.2,0.2,0.2,0.2,0.2],
	running_line:[0,0,0,0,0,0,0,0],
	measurments: [ //Lane:[Total length,Radius,Semi-circle length,Delta,Angle]
		[1,400.00,36.80,115.61,0.00,0.00],
		[2,407.67,38.02,119.44,3.83,5.78],
		[3,415.33,39.24,123.28,7.67,11.19],
		[4,423.00,40.46,127.11,11.50,16.28],
		[5,430.66,41.68,130.94,15.33,21.08],
		[6,438.33,42.90,134.77,19.16,25.60],
		[7,446.00,44.12,138.61,23.00,29.86],
		[8,453.66,45.34,142.44,26.83,33.90]
	],
	//(400 - 84.39*2)/2 = 115.61 -----> CURVE
	//curve --> (Math.PI * radius)/2
	lane_staggers:[0,7.038,14.704,22.370,30.034,37.700,45.366,53.032],
	race:{
		"400m":[
			[11.26,11.26,11.26,11.03], //44.83, 300m => 33.8
			[11.28,11.28,11.28,11.29],//45.14, 300m =>33.85
			[11.16,11.16,11.16,11.02],//44.52 => 33.5
			[11.0,11.0,11.0,10.94],//43.94 => 33
			[11.15,11.15,11.15,11.34],//44.79 => 33.45
			[11.08,11.08,11.08,11.21],//44.46 => 33.25
			[11.13,11.13,11.13,11.58],// 44.98 => 33.4
			[11.31,11.31,11.31,10.88]// 44.81 => 33.9
		],
		"200m":[
			[20.19/2,20.19/2],//20.19
			[20.57/2,20.57/2],//20.57
			[19.44/2,19.44/2],//19.44
			[9.82,10.18],//20.00
			[19.9/2,19.9/2],//19.90
			[19.32/2,19.32/2],//19.32
			[19.84/2,19.84/2],//19.84
			[20.69/2,20.69/2],//20.69
		]
	}
}

export const dimensions200m = {
	length:200,
	lane_staggers:[0,3.519,7.352,11.185,15.017,18.850,22.683,26.516],
	fixes:{
		130:[
			0, //1
			"13.20", //2 13078
			"13.07", //3 13013
			0, //4
			0, //5
			"12.70", //6 12857
			0, //7
			0 //8
		]
	},
	delta_fixes:{
		130:[
			0, //1
			0, //2
			-2, //3
			0, //4
			0, //5
			-0.5, //6
			0, //7
			0 //8
		],
		200:[
			0, //1
			0, //2
			0, //3
			1, //4
			0, //5
			0, //6
			1, //7
			0 //8
		]
	}
}
export const dimensions100m = {
	length:100,
	lane_staggers:[0,3.519,7.352,11.185,15.017,18.850,22.683,26.516]
}
export function fixOrder(o) {
	return 9-(+o);
}
export const dimensions400m = {
	length:400,
	fixes:{
		100:[
			0, //1
			0, //2 
			0, //3 
			0, //4
			"9.20", //5 //9400
			0, //6 
			0, //7
			0 //8
		],
		200:[
			"18.80", //1 18990
			0, //2 
			"18.50", //3 //18810
			0, //4
			0, //5 //18520
			0, //6 
			"19.00", //7 //18820
			"19.20" //8 //19000
		],
		300:[
			0, //1
			0, //2
			0, //3
			"28.25", //4 27952.5
			"28.25", //5 28200
			0, //6
			"28.50", //7 28230
			0 //8
		]
	},
	delta_fixes:{
		300:[
			0, //1
			0, //2
			0, //3
			0, //4
			0, //5
			0, //6
			0, //7
			0 //8
		],
		400:[
			0, //1
			0, //2
			0, //3
			0, //4
			0, //5
			0, //6
			0, //7
			0 //8
		]
	}
}