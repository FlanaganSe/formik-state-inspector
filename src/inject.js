(function() {
  'use strict';

  const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!HOOK) {
    console.warn('[Formik Inspector] React DevTools Hook not found');
    console.warn('[Formik Inspector] Available on window:', Object.keys(window).filter(k => k.includes('REACT')));
    return;
  }
  
  console.log('[Formik Inspector] React DevTools Hook found');
  console.log('[Formik Inspector] Hook methods:', Object.keys(HOOK));

  let processedFibers = new WeakSet();
  let debounceTimer = null;
  let lastFormCount = 0;

  const walkFiber = (fiber, forms, depth = 0) => {
    if (!fiber || depth > 50 || processedFibers.has(fiber)) return;
    
    try {
      processedFibers.add(fiber);

      // Enhanced detection for FormikContext provider
      let isFormikProvider = false;
      let bag = null;

      // Method 1: Check if this is a Context.Provider with FormikContext
      const ctx = fiber.type?._context;
      if (ctx) {
        const displayName = ctx.displayName || ctx._displayName || '';
        if (displayName.includes('FormikContext') || displayName.includes('Formik')) {
          isFormikProvider = true;
          bag = fiber.memoizedProps?.value;
          console.log('[Formik Inspector] Found FormikContext via displayName:', displayName);
        }
      }

      // Method 2: Check if fiber.type is Context.Provider and has Formik-like props
      if (!isFormikProvider && fiber.type && fiber.type.$$typeof) {
        const props = fiber.memoizedProps;
        if (props?.value && typeof props.value === 'object') {
          const value = props.value;
          // Check for Formik bag signature - multiple required properties
          const hasFormikSignature = (
            typeof value.values === 'object' &&
            typeof value.errors === 'object' &&
            typeof value.touched === 'object' &&
            typeof value.handleSubmit === 'function' &&
            typeof value.handleChange === 'function' &&
            (typeof value.isSubmitting === 'boolean' || value.isSubmitting === undefined) &&
            (typeof value.isValidating === 'boolean' || value.isValidating === undefined)
          );
          
          if (hasFormikSignature) {
            isFormikProvider = true;
            bag = value;
            console.log('[Formik Inspector] Found FormikContext via signature detection');
          }
        }
      }

      // Method 3: Direct component name check
      if (!isFormikProvider && fiber.type && fiber.type.name) {
        if (fiber.type.name.includes('FormikContext') || fiber.type.name.includes('Formik')) {
          const props = fiber.memoizedProps;
          if (props?.value) {
            isFormikProvider = true;
            bag = props.value;
            console.log('[Formik Inspector] Found FormikContext via component name:', fiber.type.name);
          }
        }
      }

      if (isFormikProvider && bag && typeof bag === 'object') {
        console.log('[Formik Inspector] Processing Formik bag:', bag);
        const formData = {
          id: `form-${forms.length}`,
          values: bag.values ?? {},
          errors: bag.errors ?? {},
          touched: bag.touched ?? {},
          isSubmitting: bag.isSubmitting ?? false,
          isValidating: bag.isValidating ?? false,
          isValid: bag.isValid ?? true,
          submitCount: bag.submitCount ?? 0,
          dirty: bag.dirty ?? false,
          status: bag.status,
          initialValues: bag.initialValues ?? {}
        };
        forms.push(formData);
        console.log('[Formik Inspector] Added form data:', formData);
      }

      // Walk children
      if (fiber.child) walkFiber(fiber.child, forms, depth + 1);
      if (fiber.sibling) walkFiber(fiber.sibling, forms, depth);
    } catch (error) {
      console.warn('[Formik Inspector] Error walking fiber:', error);
    }
  };

  const scanForms = () => {
    const forms = [];
    processedFibers = new WeakSet(); // WeakSet doesn't have clear(), so recreate it
    
    console.log('[Formik Inspector] Starting form scan...');
    console.log('[Formik Inspector] React Hook available:', !!HOOK);
    console.log('[Formik Inspector] getFiberRoots available:', !!HOOK.getFiberRoots);

    try {
      if (HOOK.getFiberRoots && HOOK.renderers && typeof HOOK.renderers.forEach === 'function') {
        console.log('[Formik Inspector] Using getFiberRoots per renderer');
        let totalRoots = 0;
        HOOK.renderers.forEach((renderer, id) => {
          try {
            const roots = HOOK.getFiberRoots(id);
            console.log('[Formik Inspector] Renderer', id, 'roots:', roots);
            if (roots && roots.size > 0) {
              totalRoots += roots.size;
              roots.forEach(root => {
                const current = root && root.current;
                if (current) {
                  walkFiber(current, forms);
                }
              });
            }
          } catch (e) {
            console.log('[Formik Inspector] Error getting roots for renderer', id, e);
          }
        });

        if (totalRoots === 0) {
          console.log('[Formik Inspector] getFiberRoots returned empty, trying alternative method');
          // Try to use the renderers directly
          if (HOOK.renderers && HOOK.renderers.size > 0) {
            console.log('[Formik Inspector] Using renderers method');
            HOOK.renderers.forEach((renderer) => {
              console.log('[Formik Inspector] Processing renderer:', renderer);
              
              // For React 19+, try to get the current fiber directly
              if (renderer.getCurrentFiber) {
                try {
                  const currentFiber = renderer.getCurrentFiber();
                  console.log('[Formik Inspector] Found current fiber:', currentFiber);
                  if (currentFiber) {
                    // Walk up to find the root
                    let current = currentFiber;
                    while (current.return) {
                      current = current.return;
                    }
                    console.log('[Formik Inspector] Walking from current fiber root:', current);
                    walkFiber(current, forms);
                  }
                } catch (e) {
                  console.log('[Formik Inspector] Error with getCurrentFiber:', e);
                }
              }
              
              // Try the old method too
              if (renderer.findFiberByHostInstance) {
                const reactRoots = document.querySelectorAll('[data-reactroot], #root, #app, .App, [class*="app"], [id*="app"]');
                reactRoots.forEach(rootElement => {
                  try {
                    // findFiberByHostInstance expects a host instance managed by React; prefer a child
                    const hostCandidate = rootElement.firstElementChild || rootElement;
                    const fiber = renderer.findFiberByHostInstance(hostCandidate);
                    console.log('[Formik Inspector] Found fiber via renderer:', fiber);
                    if (fiber) {
                      // Walk up to find the root
                      let current = fiber;
                      while (current.return || current._owner) {
                        current = current.return || current._owner;
                      }
                      walkFiber(current, forms);
                    }
                  } catch (e) {
                    console.log('[Formik Inspector] Error with renderer method:', e);
                  }
                });
              }
            });
          }
        }
      } else if (HOOK._rendererInterfaces) {
        console.log('[Formik Inspector] Using _rendererInterfaces fallback');
        // Fallback for older React DevTools
        Object.values(HOOK._rendererInterfaces).forEach(renderer => {
          if (renderer.findFiberByHostInstance) {
            const container = document.querySelector('[data-reactroot]') || document.body;
            const fiber = renderer.findFiberByHostInstance(container);
            console.log('[Formik Inspector] Found fiber via findFiberByHostInstance:', fiber);
            if (fiber) walkFiber(fiber, forms);
          }
        });
      } else {
        console.log('[Formik Inspector] Trying alternative fiber access methods');
        
        // Alternative method: Try to find React roots in DOM
        const reactRoots = document.querySelectorAll('[data-reactroot], #root, #app, .App, [class*="app"], [id*="app"]');
        console.log('[Formik Inspector] Found potential React roots:', reactRoots);
        
        reactRoots.forEach((rootElement, index) => {
          console.log(`[Formik Inspector] Checking root element ${index}:`, rootElement);
          
          // Try to get fiber from the DOM node
          const allKeys = Object.keys(rootElement);
          console.log(`[Formik Inspector] All keys on root element ${index}:`, allKeys);
          
          const fiberKey = allKeys.find(key => 
            key.startsWith('__reactFiber') || 
            key.startsWith('__reactInternalInstance') ||
            key.startsWith('__reactContainer')
          );
          
          if (fiberKey) {
            const fiber = rootElement[fiberKey];
            console.log('[Formik Inspector] Found fiber via DOM key:', fiberKey, fiber);
            if (fiber) {
              // Walk up to find the root
              let current = fiber;
              while (current.return) {
                current = current.return;
              }
              console.log('[Formik Inspector] Walking from root fiber:', current);
              walkFiber(current, forms);
            }
          } else {
            console.log(`[Formik Inspector] No React fiber key found on element ${index}`);
          }
        });
        
        // Also try looking for React components directly in the page
        console.log('[Formik Inspector] Scanning DOM elements for React fibers...');
        const allElements = document.querySelectorAll('*');
        let checkedCount = 0;
        let fibersFound = 0;
        
        for (const element of allElements) {
          if (checkedCount++ > 100) break; // Check more elements
          
          const keys = Object.keys(element);
          const reactKey = keys.find(key => 
            key.startsWith('__reactFiber') || 
            key.startsWith('__reactInternalInstance') ||
            key.startsWith('__reactContainer')
          );
          
          if (reactKey) {
            fibersFound++;
            const fiber = element[reactKey];
            console.log(`[Formik Inspector] Found React fiber ${fibersFound} on element:`, element.tagName, element.className, fiber);
            
            if (fiber) {
              // Try walking from this fiber
              walkFiber(fiber, forms);
              
              // Also walk from the root
              let current = fiber;
              while (current.return) {
                current = current.return;
              }
              if (current !== fiber) {
                console.log('[Formik Inspector] Walking from fiber root:', current);
                walkFiber(current, forms);
              }
              
              if (forms.length > 0) {
                console.log('[Formik Inspector] Found forms, stopping DOM scan');
                break;
              }
            }
          }
        }
        
        console.log(`[Formik Inspector] DOM scan complete. Found ${fibersFound} React fibers, ${forms.length} Formik forms`);
        
        // If still no forms found, try a more aggressive search
        if (forms.length === 0) {
          console.log('[Formik Inspector] Trying aggressive search for Formik in global scope');
          
          // Look for Formik context in window object
          if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
            const internals = window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
            console.log('[Formik Inspector] React internals found:', internals);
            
            if (internals.ReactCurrentDispatcher && internals.ReactCurrentDispatcher.current) {
              console.log('[Formik Inspector] Current dispatcher:', internals.ReactCurrentDispatcher.current);
            }
          }
          
          // Try to find any Formik-related objects in window
          const formikKeys = Object.keys(window).filter(key => 
            key.toLowerCase().includes('formik') || 
            key.toLowerCase().includes('form')
          );
          console.log('[Formik Inspector] Formik-related window keys:', formikKeys);
        }
        
        if (forms.length === 0) {
          console.warn('[Formik Inspector] No supported method found for accessing fiber roots');
          console.warn('[Formik Inspector] Available HOOK properties:', Object.keys(HOOK));
        }
      }
    } catch (error) {
      console.warn('[Formik Inspector] Error scanning forms:', error);
    }

    console.log('[Formik Inspector] Scan complete. Found', forms.length, 'forms');
    return forms;
  };

  const sendUpdate = () => {
    const forms = scanForms();
    const message = {
      source: 'formik-inspector',
      type: 'forms-update',
      forms,
      timestamp: Date.now()
    };

    window.postMessage(message, '*');

    // Update badge if form count changed
    if (forms.length !== lastFormCount) {
      lastFormCount = forms.length;
      window.postMessage({
        source: 'formik-inspector',
        type: 'badge-update',
        count: forms.length
      }, '*');
    }
  };

  const debouncedUpdate = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(sendUpdate, 100);
  };

  // Initial scan with multiple attempts
  setTimeout(sendUpdate, 1000);
  setTimeout(sendUpdate, 3000);
  setTimeout(sendUpdate, 5000);

  // Subscribe to React commits
  if (HOOK.onCommitFiberRoot) {
    const originalCommit = HOOK.onCommitFiberRoot;
    HOOK.onCommitFiberRoot = function(...args) {
      try {
        originalCommit.apply(this, args);
        debouncedUpdate();
      } catch (error) {
        console.warn('[Formik Inspector] Error in commit handler:', error);
      }
    };
  }

  // Listen for manual refresh requests
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'formik-inspector' && event.data?.type === 'refresh-request') {
      sendUpdate();
    }
  });

  // Expose debugging utilities
  window.__FORMIK_INSPECTOR_DEBUG__ = {
    scanForms,
    walkFiber,
    HOOK,
    forceScan: () => {
      console.log('[Formik Inspector] Force scanning...');
      sendUpdate();
    }
  };

  console.log('[Formik Inspector] Injected successfully');
  console.log('[Formik Inspector] Debug utilities available at window.__FORMIK_INSPECTOR_DEBUG__');
})();
