(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const number = id => {
    const node = byId(id);
    const value = Number.parseFloat(node?.value ?? '');
    return Number.isFinite(value) ? value : NaN;
  };
  const fmt = (value, digits = 2) =>
    Number.isFinite(value)
      ? value.toLocaleString('en-IN', { maximumFractionDigits: digits })
      : '—';

  const setResult = (id, message, valid = false) => {
    const node = byId(id);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-valid', valid);
  };

  const popup = (title, formula, values, message, valid) => {
    let modal = byId('calculator-result-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'calculator-result-modal';
      modal.className = 'calculator-result-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'calculator-result-title');
      modal.innerHTML = '<div class="calculator-result-modal__backdrop" data-close-calculator></div>' +
        '<div class="calculator-result-modal__panel">' +
        '<button type="button" class="calculator-result-modal__close" aria-label="Close calculation result" data-close-calculator>×</button>' +
        '<p class="section-kicker">Calculation result</p>' +
        '<h2 id="calculator-result-title"></h2>' +
        '<p class="calculator-result-modal__formula"></p>' +
        '<p class="calculator-result-modal__inputs"></p>' +
        '<p class="calculator-result-modal__value"></p>' +
        '<button type="button" class="btn" data-close-calculator>Close</button>' +
        '</div>';
      document.body.append(modal);
      modal.querySelectorAll('[data-close-calculator]').forEach(button => {
        button.addEventListener('click', () => {
          modal.classList.remove('is-open');
          document.body.classList.remove('calculator-modal-open');
        });
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
          modal.classList.remove('is-open');
          document.body.classList.remove('calculator-modal-open');
        }
      });
    }
    byId('calculator-result-title').textContent = title;
    modal.querySelector('.calculator-result-modal__formula').textContent = 'Formula: ' + formula;
    modal.querySelector('.calculator-result-modal__inputs').textContent = 'Values used: ' + values;
    const value = modal.querySelector('.calculator-result-modal__value');
    value.textContent = message;
    value.classList.toggle('is-valid', valid);
    modal.classList.add('is-open');
    document.body.classList.add('calculator-modal-open');
    modal.querySelector('.calculator-result-modal__close').focus();
  };

  const calculations = {
    ro: () => {
      const feed = number('ro-feed'), permeate = number('ro-perm');
      const ok = Number.isFinite(feed) && feed > 0 && Number.isFinite(permeate) && permeate >= 0 && permeate <= feed;
      const result = ok ? 'Recovery: ' + fmt(permeate / feed * 100, 1) + '%' : 'Enter feed > 0 and permeate between 0 and feed.';
      return { title:'RO Recovery', formula:'Permeate ÷ Feed × 100', values:permeate + ' ÷ ' + feed + ' × 100', output:'ro-out', result, ok };
    },
    dose: () => {
      const flow = number('dose-flow'), ppm = number('dose-ppm');
      const ok = Number.isFinite(flow) && flow > 0 && Number.isFinite(ppm) && ppm >= 0;
      const result = ok ? 'Chemical mass: ' + fmt(flow * ppm / 1000, 3) + ' kg/h' : 'Enter flow > 0 and dose ≥ 0.';
      return { title:'Chemical Dosing', formula:'Flow × Dose ÷ 1000', values:flow + ' × ' + ppm + ' ÷ 1000', output:'dose-out', result, ok };
    },
    tank: () => {
      const l = number('tank-l'), w = number('tank-w'), d = number('tank-d');
      const v = l * w * d, ok = Number.isFinite(v) && l > 0 && w > 0 && d > 0;
      const result = ok ? 'Volume: ' + fmt(v) + ' m³ (' + fmt(v * 1000, 0) + ' L)' : 'Enter all dimensions greater than 0.';
      return { title:'Rectangular Tank Volume', formula:'Length × Width × Depth', values:l + ' × ' + w + ' × ' + d, output:'tank-out', result, ok };
    },
    ct: () => {
      const makeup = number('ct-makeup'), circulating = number('ct-circ');
      const ok = Number.isFinite(makeup) && makeup > 0 && Number.isFinite(circulating) && circulating >= makeup;
      const result = ok ? 'Estimated cycles: ' + fmt(circulating / makeup, 2) : 'Enter make-up > 0 and circulating conductivity ≥ make-up.';
      return { title:'Cooling Tower Cycles', formula:'Circulating conductivity ÷ Make-up conductivity', values:circulating + ' ÷ ' + makeup, output:'ct-out', result, ok };
    },
    cod: () => {
      const flow = number('cod-flow'), cod = number('cod-conc');
      const ok = Number.isFinite(flow) && flow > 0 && Number.isFinite(cod) && cod >= 0;
      const result = ok ? 'COD load: ' + fmt(flow * cod / 1000, 2) + ' kg/day' : 'Enter flow > 0 and COD ≥ 0.';
      return { title:'ETP COD Load', formula:'Flow × COD ÷ 1000', values:flow + ' × ' + cod + ' ÷ 1000', output:'cod-out', result, ok };
    },
    chlorine: () => {
      const flow = number('chlor-flow'), dose = number('chlor-dose'), strength = number('chlor-strength');
      const ok = Number.isFinite(flow) && flow > 0 && Number.isFinite(dose) && dose >= 0 && Number.isFinite(strength) && strength > 0;
      const product = flow * dose / (10 * strength);
      const result = ok ? 'Approx. product feed: ' + fmt(product, 3) + ' L/h' : 'Enter flow > 0, dose ≥ 0 and strength > 0.';
      return { title:'Chlorine Product Feed', formula:'Flow × Dose ÷ (10 × Strength)', values:flow + ' × ' + dose + ' ÷ (10 × ' + strength + ')', output:'chlor-out', result, ok };
    },
    pump: () => {
      const flow = number('pump-flow'), head = number('pump-head'), efficiency = number('pump-eff');
      const ok = Number.isFinite(flow) && flow > 0 && Number.isFinite(head) && head > 0 && Number.isFinite(efficiency) && efficiency > 0 && efficiency <= 100;
      const power = (1000 * 9.81 * (flow / 3600) * head) / (efficiency / 100) / 1000;
      const result = ok ? 'Hydraulic input power: ' + fmt(power, 2) + ' kW' : 'Enter positive flow/head and efficiency between 0 and 100%.';
      return { title:'Hydraulic Pump Power', formula:'ρgQH ÷ η', values:'ρ=1000 kg/m³, g=9.81 m/s², Q=' + flow + ' m³/h, H=' + head + ' m, η=' + efficiency + '%', output:'pump-out', result, ok };
    },
    detention: () => {
      const volume = number('det-volume'), flow = number('det-flow');
      const ok = Number.isFinite(volume) && volume > 0 && Number.isFinite(flow) && flow > 0;
      const hours = volume / flow;
      const result = ok ? 'HRT: ' + fmt(hours, 2) + ' h (' + fmt(hours * 60, 1) + ' min)' : 'Enter tank volume and flow greater than 0.';
      return { title:'Tank Detention Time', formula:'Volume ÷ Flow', values:volume + ' ÷ ' + flow, output:'det-out', result, ok };
    },
    filter: () => {
      const flow = number('filter-flow'), diameter = number('filter-dia');
      const area = Math.PI * Math.pow(diameter / 2, 2);
      const ok = Number.isFinite(flow) && flow > 0 && Number.isFinite(diameter) && diameter > 0;
      const result = ok ? 'Filter area: ' + fmt(area, 3) + ' m²; loading rate: ' + fmt(flow / area, 2) + ' m³/m²/h' : 'Enter flow and filter diameter greater than 0.';
      return { title:'Filter Loading Rate', formula:'Flow ÷ (π × diameter² ÷ 4)', values:flow + ' ÷ [π × (' + diameter + '²) ÷ 4]', output:'filter-out', result, ok };
    },
    fm: () => {
      const flow = number('fm-flow'), bod = number('fm-bod'), mlss = number('fm-mlss'), volume = number('fm-volume');
      const food = flow * bod / 1000;
      const biomass = mlss * volume / 1000;
      const ok = Number.isFinite(flow) && flow > 0 && Number.isFinite(bod) && bod >= 0 && Number.isFinite(mlss) && mlss > 0 && Number.isFinite(volume) && volume > 0;
      const ratio = food / biomass;
      const result = ok ? 'F/M ratio: ' + fmt(ratio, 3) + ' kg BOD/kg MLSS·day' : 'Enter flow, BOD ≥ 0, MLSS > 0 and tank volume > 0.';
      return { title:'ETP F/M Ratio', formula:'[Flow × BOD ÷ 1000] ÷ [MLSS × Volume ÷ 1000]', values:'(' + flow + ' × ' + bod + ' ÷ 1000) ÷ (' + mlss + ' × ' + volume + ' ÷ 1000)', output:'fm-out', result, ok };
    }
  };

  const run = (type, openPopup = false) => {
    const calc = calculations[type];
    if (!calc) return;
    const data = calc();
    setResult(data.output, data.result, data.ok);
    if (openPopup) popup(data.title, data.formula, data.values, data.result, data.ok);
  };

  const init = () => {
    document.querySelectorAll('.calculator-card input').forEach(input => {
      const card = input.closest('.calculator-card');
      const button = card?.querySelector('[data-calc]');
      input.addEventListener('input', () => {
        if (button) run(button.dataset.calc, false);
      });
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && button) {
          event.preventDefault();
          run(button.dataset.calc, true);
        }
      });
    });
    document.querySelectorAll('[data-calc]').forEach(button => {
      button.addEventListener('click', () => run(button.dataset.calc, true));
    });
    Object.keys(calculations).forEach(type => run(type, false));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
