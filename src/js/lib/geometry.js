export function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

export function describeArc(x, y, radius, startAngle, endAngle){

    var antiClockWise = 0;
    if(startAngle < 0) {
        antiClockWise=1;
        //startAngle=Math.abs(startAngle);
    }

      

    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);

    var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", antiClockWise?start.x:end.x, antiClockWise?start.y:end.y, 
        "A", radius, radius, 0, arcSweep, 0, antiClockWise?end.x:start.x, antiClockWise?end.y:start.y
    ].join(" ");

    return {
      start:antiClockWise?[start.x,start.y]:[end.x,end.y],
      end:antiClockWise?[end.x,end.y]:[start.x,start.y],
      path:d,
      arc:["A", radius, radius, 0, arcSweep, 0, antiClockWise?end.x:start.x, antiClockWise?end.y:start.y].join(" ")
    };
}
export function describeInverseArc(x, y, radius, startAngle, endAngle){

    var antiClockWise = 0;
    if(startAngle < 0) {
        antiClockWise=1;
        //startAngle=Math.abs(startAngle);
    }

    antiClockWise=0;

    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);

    var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", antiClockWise?start.x:end.x, antiClockWise?start.y:end.y, 
        "A", radius, radius, 0, arcSweep, 1, antiClockWise?end.x:start.x, antiClockWise?end.y:start.y
    ].join(" ");

    return {
      start:antiClockWise?[start.x,start.y]:[end.x,end.y],
      end:antiClockWise?[end.x,end.y]:[start.x,start.y],
      path:d,
      arc:["A", radius, radius, 0, arcSweep, 1, antiClockWise?end.x:start.x, antiClockWise?end.y:start.y].join(" ")
    };
}


export function getArcLength(alpha,radius) {
  return alpha * Math.PI/180 * radius;
}
export function getAngle(arc_length,radius) {
  return arc_length/(radius)*(180/Math.PI);
}
export function toRad(deg) {
  return deg * (Math.PI / 180);
}
export function toDeg(rad) {
  return rad / (Math.PI / 180);
}