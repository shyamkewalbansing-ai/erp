import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Delete, ArrowUp } from 'lucide-react';

const LAYOUTS = {
  alpha: [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['SHIFT','z','x','c','v','b','n','m','DEL'],
    ['123','@','.','SPACE','-','_','OK'],
  ],
  numeric: [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['-','/',':',';','(',')','$','&','@','"'],
    ['.',',','?','!','\'','+','=','DEL'],
    ['ABC','SPACE','.com','.sr','OK'],
  ]
};

export default function VirtualKeyboard() {
  const [visible, setVisible] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [layout, setLayout] = useState('alpha');
  const [shifted, setShifted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const keyboardRef = useRef(null);

  // Detect touch-only device (no physical keyboard likely)
  useEffect(() => {
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const noFinePointer = !window.matchMedia('(pointer: fine)').matches;
      // Touch device without fine pointer = likely no physical keyboard
      setIsTouchDevice(hasTouch && isCoarse && noFinePointer);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Listen for input focus
  useEffect(() => {
    if (!isTouchDevice) return;

    const handleFocus = (e) => {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const type = el.getAttribute('type') || 'text';
        if (['text','email','tel','search','password','number','url'].includes(type)) {
          // Don't show for select elements or date inputs
          setActiveInput(el);
          setLayout(type === 'number' || type === 'tel' ? 'numeric' : 'alpha');
          setShifted(false);
          setVisible(true);
          // Prevent native keyboard
          el.setAttribute('readonly', 'readonly');
          setTimeout(() => el.removeAttribute('readonly'), 50);
        }
      }
    };

    const handleBlur = (e) => {
      // Small delay to allow keyboard key clicks to register
      setTimeout(() => {
        if (keyboardRef.current && !keyboardRef.current.contains(document.activeElement)) {
          // Don't hide if clicking on keyboard itself
        }
      }, 200);
    };

    document.addEventListener('focusin', handleFocus, true);
    return () => document.removeEventListener('focusin', handleFocus, true);
  }, [isTouchDevice]);

  const triggerInputEvent = useCallback((input, newValue) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, newValue);
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, []);

  const handleKey = useCallback((key) => {
    if (!activeInput) return;
    const el = activeInput;
    let current = el.value || '';

    if (key === 'DEL') {
      triggerInputEvent(el, current.slice(0, -1));
    } else if (key === 'SPACE') {
      triggerInputEvent(el, current + ' ');
    } else if (key === 'SHIFT') {
      setShifted(s => !s);
      return;
    } else if (key === '123') {
      setLayout('numeric');
      return;
    } else if (key === 'ABC') {
      setLayout('alpha');
      return;
    } else if (key === 'OK') {
      setVisible(false);
      setActiveInput(null);
      el.blur();
      return;
    } else if (key === '.com' || key === '.sr') {
      triggerInputEvent(el, current + key);
    } else {
      const char = shifted ? key.toUpperCase() : key;
      triggerInputEvent(el, current + char);
      if (shifted) setShifted(false);
    }
  }, [activeInput, shifted, triggerInputEvent]);

  const handleClose = () => {
    setVisible(false);
    setActiveInput(null);
  };

  if (!isTouchDevice || !visible) return null;

  const currentLayout = LAYOUTS[layout];

  return (
    <div
      ref={keyboardRef}
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-slate-200 border-t-2 border-slate-300 shadow-2xl"
      style={{ touchAction: 'manipulation' }}
      onMouseDown={e => e.preventDefault()}
      data-testid="virtual-keyboard"
    >
      {/* Close bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-300">
        <span className="text-xs text-slate-600 font-medium">Schermtoetsenbord</span>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-slate-400 rounded transition"
          data-testid="vk-close"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
      </div>
      {/* Keys */}
      <div className="px-1 py-1.5 space-y-1">
        {currentLayout.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map((key) => {
              const isSpecial = ['SHIFT','DEL','123','ABC','OK','SPACE','.com','.sr'].includes(key);
              const isSpace = key === 'SPACE';
              const isOk = key === 'OK';
              const isShift = key === 'SHIFT';
              const isDel = key === 'DEL';

              let width = 'min-w-[36px] flex-1';
              if (isSpace) width = 'flex-[4]';
              else if (isOk) width = 'flex-[1.5]';
              else if (isShift || isDel) width = 'flex-[1.5]';
              else if (key === '.com' || key === '.sr') width = 'flex-[1.5]';

              const displayKey = isSpace ? 'spatie' :
                isDel ? '' :
                isShift ? '' :
                shifted && !isSpecial ? key.toUpperCase() : key;

              return (
                <button
                  key={key + ri}
                  onClick={() => handleKey(key)}
                  className={`${width} h-11 rounded-lg text-sm font-semibold transition active:scale-95 active:bg-slate-400 ${
                    isOk ? 'bg-orange-500 text-white' :
                    isShift && shifted ? 'bg-blue-500 text-white' :
                    isSpecial ? 'bg-slate-400 text-slate-800' :
                    'bg-white text-slate-900 shadow-sm'
                  }`}
                >
                  {isDel ? <Delete className="w-5 h-5 mx-auto" /> :
                   isShift ? <ArrowUp className="w-5 h-5 mx-auto" /> :
                   displayKey}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
