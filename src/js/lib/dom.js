
export function getOffset3(el) {
    return el ? el.offsetTop + getOffset(el.offsetParent) : 0;
}

export function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

export function getPerspective(w,h,options={}) {
	let rotate=[65,0,10],
		translate=[-265,-900,0];

	let alpha=w/1300;

	alpha=w<1200?alpha/1.3:alpha;

	translate[0]=translate[0]*(alpha);
	translate[1]=translate[1]*(alpha);

	if(options.depth) {
		translate[1]+=options.depth;
	}
	

	return `rotateX(${rotate[0]}deg) rotateY(${rotate[1]}deg) rotateZ(${rotate[2]}deg) translateX(${translate[0]}px) translateY(${translate[1]}px) translateZ(${translate[2]}px)`;
}