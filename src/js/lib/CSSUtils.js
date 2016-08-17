export function strokeShadow(item,strokeSize=2,strokeColor="#fff") {

	item.style.textShadow="none";
	
	for (var angle=0; angle<2*Math.PI; angle+=1/strokeSize) {
		appendShadow(item, Math.cos(angle) * strokeSize, Math.sin(angle) * strokeSize, strokeColor);
	}
}

function appendShadow(item, x, y, col) {
	// compute new text-shadow property

	//console.log("appendShadow",item,x,y,col,item.style.textShadow)

	var textShadow = '';
	if (item.style.textShadow !== 'none' && item.style.textShadow !== "") {
		//console.log("exists already and is",item.style.textShadow)
		textShadow = item.style.textShadow + ', ';
	}
	textShadow = textShadow + x + 'px ' + y + 'px ' + col;

	// apply new text-shadow property
	item.style.textShadow = textShadow;
	//console.log("now shadow is",item.style.textShadow,"(",textShadow,")")
	//item.style.backgroundColor = "#D93600";
	//return textShadow;

	
}