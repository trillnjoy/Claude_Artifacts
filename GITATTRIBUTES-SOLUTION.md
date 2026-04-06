# 🔧 Fix PNG Corruption with .gitattributes

## The Proper Solution

Add a `.gitattributes` file to your repository to tell GitHub to treat PNG files as binary (preventing corruption).

---

## 📁 Upload 4 Files Total

### Step 1: Upload .gitattributes FIRST

1. Go to your GitHub repository root: `github.com/trillnjoy/trillnjoy.github.io`
2. Click "Add file" → "Upload files"
3. Upload **`.gitattributes`** file
4. Commit with message: "Add .gitattributes to handle binary files"
5. **Wait for commit to complete**

### Step 2: Upload Everything Else

Now upload these 3 files:

1. **pediatric-bp-calculator.html** (34 KB - the lightweight vanilla JS version)
2. **bp_icon_192.PNG** (your custom icon)
3. **bp_icon_512.PNG** (your custom icon)
4. **bp-calculator-manifest.json** (references the PNG files)

**Optional:** 
5. **bp-calculator-sw.js** (service worker for offline support)

---

## ✅ What .gitattributes Does

The file contains:
```
*.png binary
*.PNG binary
```

This tells GitHub:
- **Don't** try to process PNG files as text
- **Don't** apply line ending conversions
- **Treat them as binary** (prevents corruption)

---

## 🎯 Final File Structure

After upload, your repo should have:

```
trillnjoy.github.io/
├── .gitattributes                    ← MUST be at root level
├── pediatric-bp-calculator.html
├── bp_icon_192.PNG
├── bp_icon_512.PNG
├── bp-calculator-manifest.json
└── bp-calculator-sw.js (optional)
```

---

## 🚀 Your Live URL

```
https://trillnjoy.github.io/pediatric-bp-calculator.html
```

---

## 📱 PWA Installation

With the PNG files working correctly:

**iPhone/iPad:**
1. Open URL in Safari
2. Share → "Add to Home Screen"
3. Your **custom BP chart icon** appears!

**Android:**
1. Open URL in Chrome
2. Menu → "Install App"
3. Custom icon on home screen

---

## ⚠️ Important Notes

### About .gitattributes:
- **Must be uploaded FIRST** before PNGs
- **Must be at repository root** (not in a subfolder)
- **File name starts with a dot**: `.gitattributes`
- Applies to all future PNG uploads in this repo

### If PNGs Still Corrupt:
1. Delete the corrupted PNG files from GitHub
2. Verify `.gitattributes` is at root level
3. Re-upload the PNG files

---

## 🎉 Advantages of This Approach

✅ **Proper solution** - Uses GitHub's intended mechanism  
✅ **Small file size** - Only 34 KB HTML + small PNGs  
✅ **Fast loading** - No 605 KB download  
✅ **Fixes forever** - All future PNG uploads protected  
✅ **Clean separation** - Icons are separate files (easier to update)  

---

## 📋 Upload Checklist

- [ ] Upload `.gitattributes` to repository root
- [ ] Commit and wait for it to complete
- [ ] Upload `pediatric-bp-calculator.html`
- [ ] Upload `bp_icon_192.PNG`
- [ ] Upload `bp_icon_512.PNG`
- [ ] Upload `bp-calculator-manifest.json`
- [ ] Upload `bp-calculator-sw.js` (optional)
- [ ] Test URL in browser
- [ ] Test "Add to Home Screen" shows custom icon
- [ ] Verify icons load (not corrupted)

---

## 🆘 If It Still Doesn't Work

If PNGs still corrupt after adding `.gitattributes`:

**Fallback Option:** Use the embedded version
- Upload `pediatric-bp-calculator-final.html` (605 KB with icons embedded)
- This version has icons as base64 inside HTML - no PNG files needed
- Guaranteed to work, just larger file size

But try `.gitattributes` first - it's the right way to fix this!
