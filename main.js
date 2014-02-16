/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $, window */

define(function (require, exports, module) {
    "use strict";

    var AppInit             = brackets.getModule("utils/AppInit"),
        CodeHintManager     = brackets.getModule("editor/CodeHintManager"),
        /*CSSUtils            = brackets.getModule("language/CSSUtils"),
        HTMLUtils           = brackets.getModule("language/HTMLUtils"),
        LanguageManager     = brackets.getModule("language/LanguageManager"),
        TokenUtils          = brackets.getModule("utils/TokenUtils"),*/
        Trie                = require("trie").Trie,
        lessSassPropHints   = LessSassPropHints;
        /*CSSProperties       = require("text!CSSProperties.json"),
        properties          = JSON.parse(CSSProperties);*/
    
    // Context of the last request for hints: either CSSUtils.PROP_NAME,
    // CSSUtils.PROP_VALUE or null.
    // var lastContext;
    
    /**
     * @constructor
     */
    function LessSassPropHints() {
        this.primaryTriggerKeys = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-()";
        this.secondaryTriggerKeys = ": ";
        this.exclusion = null;
        this.regexDeTokenize = /[\.#@](.*)$/;
        this.regexLessClsID =  /([\.#][^\s{]+)\s+{/g;
        this.regexLessVariable = /(@[\w\-]+)\s+:\s+(?:[^;]*?);/g;
        this.regexLessToken = /([\.#@][\w\-]*)$/;
        this.trie = new Trie();
    }

    /**
     * Determines whether CSS propertyname or -name hints are available in the current editor
     * context.
     * 
     * @param {Editor} editor 
     * A non-null editor object for the active window.
     *
     * @param {String} implicitChar 
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {Boolean} 
     * Determines whether the current provider is able to provide hints for
     * the given editor context and, in case implicitChar is non- null,
     * whether it is appropriate to do so.
     */
    LessSassPropHints.prototype.hasHints = function (editor, implicitChar) {
        /*this.editor = editor;
        var cursor = this.editor.getCursorPos(),
            textAfterCursor;

        lastContext = null;
        this.info = CSSUtils.getInfoAtPos(editor, cursor);
        
        if (this.info.context !== CSSUtils.PROP_NAME && this.info.context !== CSSUtils.PROP_VALUE) {
            return false;
        }
        
        if (implicitChar) {
            this.updateExclusion(false);
            if (this.info.context === CSSUtils.PROP_NAME) {
                // Check if implicitChar is the first character typed before an existing property name.
                if (!this.exclusion && this.info.offset === 1 && implicitChar === this.info.name[0]) {
                    this.exclusion = this.info.name.substr(this.info.offset);
                }
            }
            
            return (this.primaryTriggerKeys.indexOf(implicitChar) !== -1) ||
                   (this.secondaryTriggerKeys.indexOf(implicitChar) !== -1);
        } else if (this.info.context === CSSUtils.PROP_NAME) {
            if (this.info.offset === 0) {
                this.exclusion = this.info.name;
            } else {
                this.updateExclusion(true);
            }
        }*/
        this.editor = editor;
        var cursor = editor.getCursorPos();
        var text = editor.document.getText();
        var result;
        var collection = [];
        this.regexLessClsID.lastIndex = 0;
        while((result = this.regexLessClsID.exec(text)) !== null) {
            collection.push(result[1]);
        }
        this.regexLessVariable.lastIndex = 0;
        while((result = this.regexLessVariable.exec(text)) !== null) {
            collection.push(result[1]);
        }
        this.trie.wipe();
        for(var i = 0; i < collection.length; i++) {
            // Adding identifiers without markers against their marker counterparts
            this.trie.add(collection[i], this.regexDeTokenize.exec(collection[i])[1]);
        }
        return true;
    };
       
    /**
     * Returns a list of availble CSS propertyname or -value hints if possible for the current
     * editor context. 
     * 
     * @param {Editor} implicitChar 
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {jQuery.Deferred|{
     *              hints: Array.<string|jQueryObject>,
     *              match: string,
     *              selectInitial: boolean,
     *              handleWideResults: boolean}}
     * Null if the provider wishes to end the hinting session. Otherwise, a
     * response object that provides:
     * 1. a sorted array hints that consists of strings
     * 2. a string match that is used by the manager to emphasize matching
     *    substrings when rendering the hint list
     * 3. a boolean that indicates whether the first result, if one exists,
     *    should be selected by default in the hint list window.
     * 4. handleWideResults, a boolean (or undefined) that indicates whether
     *    to allow result string to stretch width of display.
     */
    LessSassPropHints.prototype.getHints = function (implicitChar) {
        /*this.cursor = this.editor.getCursorPos();
        this.info = CSSUtils.getInfoAtPos(this.editor, this.cursor);

        var needle = this.info.name,
            valueNeedle = "",
            context = this.info.context,
            valueArray,
            namedFlows,
            result,
            selectInitial = false;
            
        
        // Clear the exclusion if the user moves the cursor with left/right arrow key.
        this.updateExclusion(true);
        
        if (context === CSSUtils.PROP_VALUE) {
            
            // Always select initial value
            selectInitial = true;
            
            // When switching from a NAME to a VALUE context, restart the session
            // to give other more specialized providers a chance to intervene.
            if (lastContext === CSSUtils.PROP_NAME) {
                return true;
            } else {
                lastContext = CSSUtils.PROP_VALUE;
            }
            
            if (!properties[needle]) {
                return null;
            }
            
            // Cursor is in an existing property value or partially typed value
            if (!this.info.isNewItem && this.info.index !== -1) {
                valueNeedle = this.info.values[this.info.index].trim();
                valueNeedle = valueNeedle.substr(0, this.info.offset);
            }
            
            valueArray = properties[needle].values;
            if (properties[needle].type === "named-flow") {
                namedFlows = this.getNamedFlows();
                
                if (valueNeedle.length === this.info.offset && namedFlows.indexOf(valueNeedle) !== -1) {
                    // Exclude the partially typed named flow at cursor since it
                    // is not an existing one used in other css rule.
                    namedFlows.splice(namedFlows.indexOf(valueNeedle), 1);
                }
                
                valueArray = valueArray.concat(namedFlows);
            }
            
            result = $.map(valueArray, function (pvalue, pindex) {
                if (pvalue.indexOf(valueNeedle) === 0) {
                    return pvalue;
                }
            }).sort();
            
            return {
                hints: result,
                match: valueNeedle,
                selectInitial: selectInitial
            };
        } else if (context === CSSUtils.PROP_NAME) {
            
            // Select initial property if anything has been typed
            if (this.primaryTriggerKeys.indexOf(implicitChar) !== -1 || needle !== "") {
                selectInitial = true;
            }
            
            lastContext = CSSUtils.PROP_NAME;
            needle = needle.substr(0, this.info.offset);
            result = $.map(properties, function (pvalues, pname) {
                if (pname.indexOf(needle) === 0) {
                    return pname;
                }
            }).sort();
            
            return {
                hints: result,
                match: needle,
                selectInitial: selectInitial,
                handleWideResults: false
            };
        }
        return null;*/
        var cursor = this.editor.getCursorPos();
        var thisline = this.editor.document.getLine(cursor.line);
        thisline = thisline.substr(0, cursor.ch);
        var token = this.regexLessToken.exec(thisline);
        if(token === null) {
            return null;
        }
        token = token[1];
        var hints = this.trie.lookup(token);
        return {
            hints : hints,
            match : token,
            selectInitial : true,
            handleWideResults : false
        }
    };
    
    /**
     * Inserts a given CSS protertyname or -value hint into the current editor context. 
     * 
     * @param {String} hint 
     * The hint to be inserted into the editor context.
     * 
     * @return {Boolean} 
     * Indicates whether the manager should follow hint insertion with an
     * additional explicit hint request.
     */
    LessSassPropHints.prototype.insertHint = function (hint) {
        /*var offset = this.info.offset,
            cursor = this.editor.getCursorPos(),
            start = {line: -1, ch: -1},
            end = {line: -1, ch: -1},
            keepHints = false,
            adjustCursor = false,
            newCursor,
            ctx;
        
        if (this.info.context !== CSSUtils.PROP_NAME && this.info.context !== CSSUtils.PROP_VALUE) {
            return false;
        }
        
        start.line = end.line = cursor.line;
        start.ch = cursor.ch - offset;

        if (this.info.context === CSSUtils.PROP_NAME) {
            keepHints = true;
            var textAfterCursor = this.info.name.substr(this.info.offset);
            if (this.info.name.length === 0 || CodeHintManager.hasValidExclusion(this.exclusion, textAfterCursor)) {
                // It's a new insertion, so append a colon and set keepHints
                // to show property value hints.
                hint += ": ";
                end.ch = start.ch;
                end.ch += offset;
                    
                if (this.exclusion) {
                    // Append a space to the end of hint to insert and then adjust
                    // the cursor before that space.
                    hint += " ";
                    adjustCursor = true;
                    newCursor = { line: cursor.line,
                                  ch: start.ch + hint.length - 1 };
                    this.exclusion = null;
                }
            } else {
                // It's a replacement of an existing one or just typed in property.
                // So we need to check whether there is an existing colon following 
                // the current property name. If a colon already exists, then we also 
                // adjust the cursor position and show code hints for property values.
                end.ch = start.ch + this.info.name.length;
                ctx = TokenUtils.getInitialContext(this.editor._codeMirror, cursor);
                if (ctx.token.string.length > 0 && !ctx.token.string.match(/\S/)) {
                    // We're at the very beginning of a property name. So skip it 
                    // before we locate the colon following it.
                    TokenUtils.moveNextToken(ctx);
                }
                if (TokenUtils.moveSkippingWhitespace(TokenUtils.moveNextToken, ctx) && ctx.token.string === ": ") {
                    adjustCursor = true;
                    newCursor = { line: cursor.line,
                                  ch: cursor.ch + (hint.length - this.info.name.length) };
                } else {
                    hint += ": ";
                }
            }
        } else {
            if (!this.info.isNewItem && this.info.index !== -1) {
                // Replacing an existing property value or partially typed value
                end.ch = start.ch + this.info.values[this.info.index].length;
            } else {
                // Inserting a new property value
                end.ch = start.ch;
            }

            var parenMatch = hint.match(/\(.*?\)/);
            if (parenMatch) {
                // value has (...), so place cursor inside opening paren
                // and keep hints open
                adjustCursor = true;
                newCursor = { line: cursor.line,
                              ch: start.ch + parenMatch.index + 1 };
                keepHints = true;
            }
        }
        
        // HACK (tracking adobe/brackets#1688): We talk to the private CodeMirror instance
        // directly to replace the range instead of using the Document, as we should. The
        // reason is due to a flaw in our current document synchronization architecture when
        // inline editors are open.
        this.editor._codeMirror.replaceRange(hint, start, end);
        
        if (adjustCursor) {
            this.editor.setCursorPos(newCursor);
        }*/
        var cursor = this.editor.getCursorPos();
        var thisline = this.editor.document.getLine(cursor.line);
        thisline = thisline.substr(0, cursor.ch);
        var token = this.regexLessToken.exec(thisline)[1];
        var start = {
            line: cursor.line, 
            ch : (cursor.ch - token.length + 1)
        };
        var end = {
            line : cursor.line,
            ch : cursor.ch
        }
        this.editor._codeMirror.replaceRange(hint, start, end);
        
        // Don't want to keep hints open
        return false;       
    };
    
    AppInit.appReady(function () {
        var LessSassPropHintsVar = new lessSassPropHints();
        CodeHintManager.registerHintProvider(LessSassPropHintsVar, ["less"], 0);

        // For unit testing
        exports.lessSassPropHintsProvider = LessSassPropHints;
    });
});