import {
	timeParse,
	timeFormat
} from 'd3-time-format';

export function convertTime(str_time) {

	if(str_time.indexOf(".")<0) {
		str_time+=".0";
	}

	let split_minute=str_time.split(":");
	//console.log(split_minute)
	let minutes=split_minute.length>1?+split_minute[0]:0;



	let split_seconds=split_minute[split_minute.length>1?1:0].split("."),
		seconds=+split_seconds[0],
		tens=10*(3-split_seconds[1].length),
		mseconds=+split_seconds[1]*(tens || 1);

	// console.log("seconds",seconds)
	// console.log("mseconds",mseconds)

	return mseconds + seconds *1000 + minutes * 60 * 1000;
}
export function msToTime(milliseconds) {

	let date = new Date(milliseconds),
		h = date.getHours(),
		m = date.getMinutes(),
		s = date.getSeconds(),
		ms = date.getMilliseconds();

	return [h,m,s,ms];
}
export function formatSecondsMilliseconds(t) {
	let time_str=timeFormat("%S.%L")(t);
	
	time_str=time_str.replace(/^(0)([0-9])(.[\d]*)$/g,"$2$3");

	return time_str;
}
export function convertTimeHMS(str_time) {

	//console.log("--->",str_time)

	let milliseconds=0;
	let split_milliseconds=str_time.split(".");
	if(split_milliseconds.length>1) {
		str_time = split_milliseconds[0];
		milliseconds = +split_milliseconds[1]*Math.pow(10,split_milliseconds[1].length-3);
	}

	let colon=(str_time.match(/:/g) || []).length;

	//let parseTime = (colon===1?timeParse("%M:%S"):timeParse("%H:%M:%S"));
	let parseTime = timeParse("%m/%d/%Y %H:%M:%S");

	str_time="01/01/1970 "+(colon===1?"00:":(colon===0?"00:00:":""))+str_time;

	//console.log(str_time)
	// console.log(parseTime(str_time))
	//console.log(colon,str_time,parseTime(str_time))

	return (parseTime(str_time).getTime()+(milliseconds)) - new Date(1970,0,1).getTime();

}
export function getDistance(time,speed) {

	let milliseconds=time.split(".");
	let minutes=convertTimeHMS(milliseconds[0])+(milliseconds[1]*10);
	
	let hour=convertTimeHMS("01:00:00")

	//console.log(minutes,hour)

	//speed:hour=dist:minutes
	//dist=speed*minutes/hour
	let dist=speed*minutes/hour;
	console.log(dist)

}