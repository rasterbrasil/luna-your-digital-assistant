package com.rasterbrasil.lunaandroid

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.net.Uri
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONObject
import java.util.UUID

class LunaAccessibilityService : AccessibilityService() {
    companion object { @Volatile var instance: LunaAccessibilityService? = null }

    override fun onServiceConnected() { instance = this }
    override fun onInterrupt() {}
    override fun onDestroy() { if (instance === this) instance = null; super.onDestroy() }

    fun observe(): JSONObject {
        val root = rootInActiveWindow
        val result = JSONObject()
            .put("ok", root != null)
            .put("protocol", "LUNA-ANDROID/1")
            .put("package", root?.packageName ?: JSONObject.NULL)
            .put("className", root?.className ?: JSONObject.NULL)
            .put("windowTitle", root?.text ?: JSONObject.NULL)
        if (root != null) result.put("tree", nodeToJson(root, 0))
        return result
    }

    fun back(): Boolean = performGlobalAction(GLOBAL_ACTION_BACK)
    fun home(): Boolean = performGlobalAction(GLOBAL_ACTION_HOME)

    fun tap(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y); lineTo(x, y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 60))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    fun type(text: String): Boolean {
        val node = findFocusedEditable(rootInActiveWindow) ?: return false
        val args = Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text) }
        return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    fun openUrl(url: String): Boolean {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return runCatching { startActivity(intent); true }.getOrDefault(false)
    }

    private fun findFocusedEditable(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isEditable && (node.isFocused || node.isFocusable)) return node
        for (i in 0 until node.childCount) findFocusedEditable(node.getChild(i))?.let { return it }
        return null
    }

    private fun nodeToJson(node: AccessibilityNodeInfo, depth: Int): JSONObject {
        val item = JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("className", node.className ?: JSONObject.NULL)
            .put("text", node.text ?: JSONObject.NULL)
            .put("contentDescription", node.contentDescription ?: JSONObject.NULL)
            .put("clickable", node.isClickable)
            .put("editable", node.isEditable)
            .put("enabled", node.isEnabled)
            .put("focused", node.isFocused)
            .put("visible", node.isVisibleToUser)
        if (depth >= 5) return item
        val children = org.json.JSONArray()
        for (i in 0 until node.childCount) node.getChild(i)?.let { children.put(nodeToJson(it, depth + 1)) }
        return item.put("children", children)
    }
}
