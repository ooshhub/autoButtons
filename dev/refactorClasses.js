const action = function(name, data) {
	console.log(name, data);
}

const getArgs = (functionString) => functionString.match(/\(([^)]+)\)[=>\s]*{/)?.[1].split(/\s*,\s*/g);

console.log(getArgs(action.toString()));

console.log('brk')