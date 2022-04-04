const flt = 0.455;

const convert = (num) => {
  let nums = `${num}`.replace(/\D/g, '').split('',3).join('.')
  console.log(nums);
}

convert(flt);