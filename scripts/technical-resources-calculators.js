(()=> {
  const $=id=>document.getElementById(id);
  const n=id=>{const v=Number.parseFloat($(id)?.value??'');return Number.isFinite(v)?v:NaN};
  const f=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('en-IN',{maximumFractionDigits:d}):'—';
  const popup=(title,message,formula,values,ok)=>{
    let m=$('resource-calculator-modal');
    if(!m){
      m=document.createElement('div');m.id='resource-calculator-modal';m.className='calculator-result-modal';
      m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','resource-calculator-title');
      m.innerHTML='<div class="calculator-result-modal__backdrop" data-close-resource></div><div class="calculator-result-modal__panel"><button type="button" class="calculator-result-modal__close" aria-label="Close calculation result" data-close-resource>×</button><p class="section-kicker">Calculation result</p><h2 id="resource-calculator-title"></h2><p class="calculator-result-modal__formula"></p><p class="calculator-result-modal__inputs"></p><p class="calculator-result-modal__value"></p><button type="button" class="btn" data-close-resource>Close</button></div>';
      document.body.append(m);
      m.querySelectorAll('[data-close-resource]').forEach(b=>b.addEventListener('click',()=>{m.classList.remove('is-open');document.body.classList.remove('calculator-modal-open')}));
    }
    m.querySelector('#resource-calculator-title').textContent=title;
    m.querySelector('.calculator-result-modal__formula').textContent='Formula: '+formula;
    m.querySelector('.calculator-result-modal__inputs').textContent='Values used: '+values;
    const v=m.querySelector('.calculator-result-modal__value');v.textContent=message;v.classList.toggle('is-valid',ok);
    m.classList.add('is-open');document.body.classList.add('calculator-modal-open');m.querySelector('.calculator-result-modal__close').focus();
  };
  const result=(id,msg,ok)=>{const e=$(id);if(e){e.textContent=msg;e.classList.toggle('is-valid',ok)}};
  const calc=t=>{
    if(t==='ro'){const a=n('res-ro-feed'),b=n('res-ro-perm'),ok=Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>=0&&b<=a,msg=ok?'Recovery: '+f(b/a*100,1)+'%':'Enter feed > 0 and permeate between 0 and feed.';result('res-ro-out',msg,ok);if(ok||Number.isFinite(a)||Number.isFinite(b))popup('RO Recovery',msg,'(Permeate ÷ Feed) × 100',b+' ÷ '+a+' × 100',ok)}
    if(t==='dose'){const a=n('res-dose-flow'),b=n('res-dose-ppm'),ok=Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>=0,msg=ok?'Chemical mass: '+f(a*b/1000,3)+' kg/h':'Enter flow > 0 and dose ≥ 0.';result('res-dose-out',msg,ok);if(ok||Number.isFinite(a)||Number.isFinite(b))popup('Chemical Dosing',msg,'Flow × Dose ÷ 1000',a+' × '+b+' ÷ 1000',ok)}
    if(t==='tank'){const a=n('res-tank-l'),b=n('res-tank-w'),d=n('res-tank-d'),v=a*b*d,ok=Number.isFinite(v)&&a>0&&b>0&&d>0,msg=ok?'Volume: '+f(v)+' m³ ('+f(v*1000,0)+' L)':'Enter all dimensions > 0.';result('res-tank-out',msg,ok);if(ok||Number.isFinite(a)||Number.isFinite(b)||Number.isFinite(d))popup('Rectangular Tank Volume',msg,'Length × Width × Depth',a+' × '+b+' × '+d,ok)}
    if(t==='ct'){const a=n('res-ct-makeup'),b=n('res-ct-circ'),ok=Number.isFinite(a)&&a>0&&Number.isFinite(b)&&b>=a,msg=ok?'Estimated cycles: '+f(b/a,2):'Enter make-up > 0 and circulating ≥ make-up.';result('res-ct-out',msg,ok);if(ok||Number.isFinite(a)||Number.isFinite(b))popup('Cooling Tower Cycles',msg,'Circulating conductivity ÷ Make-up conductivity',b+' ÷ '+a,ok)}
  };
  document.querySelectorAll('[data-resource-calc]').forEach(b=>b.addEventListener('click',()=>calc(b.dataset.resourceCalc)));
})();
