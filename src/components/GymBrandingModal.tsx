import React, { useState, useRef } from 'react';
import { X, Upload, Sliders, Check, Sparkles, Image as ImageIcon, RotateCcw, Link2 } from 'lucide-react';
import { GymSettings, GymLogoSettings } from '../types';
import { GymLogoDisplay } from './GymLogoDisplay';

interface GymBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GymSettings;
  onSaveSettings: (newSettings: GymSettings) => void;
}

export const GymBrandingModal: React.FC<GymBrandingModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [gymName, setGymName] = useState(settings.gymName || 'Arte Suave BJJ Academy');
  const [slogan, setSlogan] = useState(
    settings.slogan || 'Where Technique Conquers Strength • Honor, Discipline & Respect'
  );

  const configuredLogo: GymLogoSettings = settings.logo || {
    preset: 'emblem-shield',
    width: 76,
    height: 76,
    borderRadius: 12,
    fit: 'contain',
    borderWidth: 1,
    borderColor: '#dc2626',
    padding: 0,
    backgroundColor: '#7f1d1d',
    showEmblemFallback: true,
  };

  const initialLogo: GymLogoSettings = {
    ...configuredLogo,
    width: Math.max(configuredLogo.width <= 56 ? 76 : configuredLogo.width, 64),
    height: Math.max(configuredLogo.height <= 56 ? 76 : configuredLogo.height, 64),
  };

  const [logo, setLogo] = useState<GymLogoSettings>(initialLogo);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [customUrlInput, setCustomUrlInput] = useState(initialLogo.url || '');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local file upload (converts to base64 so it works without backend servers)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setUploadError('Image size should be under 2.5MB for optimal speed.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogo((prev) => ({
        ...prev,
        url: base64,
        preset: undefined,
      }));
      setCustomUrlInput(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleWidthChange = (val: number) => {
    setLogo((prev) => {
      if (keepAspectRatio) {
        return { ...prev, width: val, height: val };
      }
      return { ...prev, width: val };
    });
  };

  const handleHeightChange = (val: number) => {
    setLogo((prev) => {
      if (keepAspectRatio) {
        return { ...prev, width: val, height: val };
      }
      return { ...prev, height: val };
    });
  };

  const handleSave = () => {
    const updated: GymSettings = {
      ...settings,
      gymName: gymName.trim() || 'Arte Suave BJJ Academy',
      slogan: slogan.trim() || 'Where Technique Conquers Strength',
      logo: {
        ...logo,
        url: customUrlInput.trim() ? customUrlInput.trim() : undefined,
      },
    };
    onSaveSettings(updated);
    onClose();
  };

  const handleResetToDefault = () => {
    setGymName('Arte Suave BJJ Academy');
    setSlogan('Where Technique Conquers Strength • Honor, Discipline & Respect');
    setLogo({
      preset: 'emblem-shield',
      width: 48,
      height: 48,
      borderRadius: 10,
      fit: 'contain',
      borderWidth: 1,
      borderColor: '#dc2626',
      padding: 0,
      backgroundColor: '#7f1d1d',
      showEmblemFallback: true,
    });
    setCustomUrlInput('');
    setUploadError(null);
  };

  return (
    <div
      id="modal-gym-branding-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Gym Logo & Slogan Customizer
              </h2>
              <p className="text-xs text-stone-400">
                Put your gym's official logo, freely resize or style it, and set your academy slogan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto">
          {/* LIVE PREVIEW BOX */}
          <div className="bg-stone-950 rounded-xl p-4 sm:p-5 border border-stone-800 text-stone-200">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-3">
              Live Header & Slogan Preview
            </span>

            <div className="bg-stone-900/90 rounded-xl p-4 border border-stone-800 shadow-inner flex flex-col sm:flex-row items-center gap-4">
              <GymLogoDisplay
                logo={{
                  ...logo,
                  url: customUrlInput.trim() ? customUrlInput.trim() : undefined,
                }}
                gymName={gymName}
              />
              <div className="text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    {gymName || 'Arte Suave BJJ Academy'}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-extrabold tracking-wider bg-red-950 text-red-300 rounded border border-red-800">
                    Active Logo
                  </span>
                </div>
                {/* Slogan rendered right under logo and title */}
                <p className="text-sm sm:text-base text-amber-400 font-semibold tracking-wide mt-1 italic">
                  "{slogan || 'Where Technique Conquers Strength'}"
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Current logo size: <strong className="text-white">{logo.width}px × {logo.height}px</strong> • Radius: {logo.borderRadius >= 90 ? 'Circle' : `${logo.borderRadius}px`}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: LOGO IMAGE SOURCE */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-red-400" />
              <span>1. Gym Logo Source</span>
            </h3>

            {/* Upload Button + Image URL input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File Upload Box */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Upload Logo File
                  </label>
                  <p className="text-[11px] text-stone-400 mb-3">
                    Upload your gym's PNG, JPG, or SVG logo.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:border-stone-500 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Upload className="w-4 h-4 text-red-400" />
                  <span>Choose Image File...</span>
                </button>
              </div>

              {/* Image URL Input */}
              <div className="p-3.5 bg-stone-950/70 rounded-xl border border-stone-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Or Enter Image Web URL
                  </label>
                  <p className="text-[11px] text-stone-400 mb-2">
                    Paste any public image link or CDN logo.
                  </p>
                </div>
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setLogo((prev) => ({
                      ...prev,
                      url: e.target.value,
                      preset: undefined,
                    }));
                  }}
                  placeholder="https://yourgym.com/logo.png"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-red-400 bg-red-950/30 p-2 rounded-lg border border-red-900">
                {uploadError}
              </p>
            )}

            {/* Quick Logo Presets */}
            <div className="pt-2">
              <span className="text-[11px] text-stone-400 font-medium block mb-2">
                Or pick a martial arts insignia preset:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'emblem-shield', label: 'Classic Red Shield', sub: 'BJJ Monogram' },
                  { id: 'tiger-crest', label: 'Flame / Tiger', sub: 'Gold & Red' },
                  { id: 'kimono-crest', label: 'Kanji Crest', sub: '柔術 Jiu-Jitsu' },
                  { id: 'octagon', label: 'Octagon Shield', sub: 'Gold Combat' },
                ].map((p) => {
                  const isSelected = !customUrlInput && logo.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCustomUrlInput('');
                        setLogo((prev) => ({
                          ...prev,
                          preset: p.id,
                          url: undefined,
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-red-950/60 border-red-500 text-white shadow-xs'
                          : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{p.label}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{p.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: FREE RESIZING & DIMENSIONS SLIDERS */}
          <div className="space-y-4 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-red-400" />
                <span>2. Free Size & Shape Controls</span>
              </h3>
              <button
                type="button"
                onClick={() => setKeepAspectRatio(!keepAspectRatio)}
                className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1.5 transition-colors ${
                  keepAspectRatio
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Lock 1:1 Aspect Ratio ({keepAspectRatio ? 'On' : 'Off'})</span>
              </button>
            </div>

            {/* Quick Size Preset Buttons */}
            <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-2">
              <span className="text-[11px] text-stone-400 font-semibold block">
                Quick Logo Size Presets:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'Medium', size: 76 },
                  { label: 'Large', size: 96 },
                  { label: 'Extra Large', size: 120 },
                  { label: 'Hero Display', size: 150 },
                  { label: 'Mega', size: 180 },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() => {
                      setLogo((prev) => ({
                        ...prev,
                        width: preset.size,
                        height: keepAspectRatio ? preset.size : prev.height,
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      logo.width === preset.size
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
                    }`}
                  >
                    {preset.label} ({preset.size}px)
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Width Slider */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Logo Width</span>
                  <span className="font-mono text-red-400 font-bold">{logo.width}px</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={220}
                  step={2}
                  value={logo.width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>Compact (40px)</span>
                  <span>Standard (76px)</span>
                  <span>Hero (150px)</span>
                  <span>Mega (220px)</span>
                </div>
              </div>

              {/* Height Slider */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Logo Height</span>
                  <span className="font-mono text-red-400 font-bold">{logo.height}px</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={220}
                  step={2}
                  value={logo.height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>Compact (40px)</span>
                  <span>Standard (76px)</span>
                  <span>Hero (150px)</span>
                  <span>Mega (220px)</span>
                </div>
              </div>

              {/* Border Radius (Shape) Slider */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Corner Radius (Shape)</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {logo.borderRadius >= 90 ? 'Circle' : `${logo.borderRadius}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={2}
                  value={logo.borderRadius}
                  onChange={(e) =>
                    setLogo((prev) => ({ ...prev, borderRadius: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>Square (0px)</span>
                  <span>Soft (12px)</span>
                  <span>Circle (9999px)</span>
                </div>
              </div>

              {/* Border Width & Color */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Border Style</span>
                  <span className="text-[11px] text-stone-400">
                    {logo.borderWidth === 0 ? 'No Border' : `${logo.borderWidth}px border`}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[0, 1, 2, 4].map((bw) => (
                    <button
                      key={bw}
                      type="button"
                      onClick={() => setLogo((prev) => ({ ...prev, borderWidth: bw }))}
                      className={`flex-1 py-1 text-xs rounded font-bold border transition-colors ${
                        logo.borderWidth === bw
                          ? 'bg-stone-700 text-white border-red-500'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                      }`}
                    >
                      {bw === 0 ? 'None' : `${bw}px`}
                    </button>
                  ))}
                  {logo.borderWidth > 0 && (
                    <input
                      type="color"
                      value={logo.borderColor || '#dc2626'}
                      onChange={(e) =>
                        setLogo((prev) => ({ ...prev, borderColor: e.target.value }))
                      }
                      title="Pick border color"
                      className="w-8 h-8 rounded bg-transparent cursor-pointer border border-stone-700"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: GYM NAME & SLOGAN TEXT */}
          <div className="space-y-4 pt-2 border-t border-stone-800">
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>3. Gym Name & Slogan Under Logo</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Academy / Gym Title
                </label>
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="Arte Suave BJJ Academy"
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Academy Slogan (Displayed right under logo)
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Where Technique Conquers Strength • Honor, Discipline & Respect"
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-amber-300 focus:outline-none focus:border-amber-500 font-medium italic"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  This slogan will be prominently featured right underneath the gym logo in the header and on student receipts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-stone-800 flex items-center justify-between bg-stone-950/80 gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-stone-400 hover:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Logo & Slogan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
