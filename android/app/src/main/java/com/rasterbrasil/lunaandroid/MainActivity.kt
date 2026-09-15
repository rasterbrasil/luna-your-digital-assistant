package com.rasterbrasil.lunaandroid

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 32, 32, 32) }
        status = TextView(this).apply { textSize = 18f; text = "Luna Android Agent\n\nAccessibility: verificando..." }
        val settings = Button(this).apply { text = "Ativar acessibilidade da Luna"; setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) } }
        val home = Button(this).apply { text = "Teste: Luna → Tela inicial"; setOnClickListener { LunaAccessibilityService.instance?.home() } }
        val back = Button(this).apply { text = "Teste: Luna → Voltar"; setOnClickListener { LunaAccessibilityService.instance?.back() } }
        val observe = Button(this).apply { text = "Teste: observar tela"; setOnClickListener { status.text = LunaAccessibilityService.instance?.observe()?.toString(2) ?: "AccessibilityService não está ativo." } }
        layout.addView(status); layout.addView(settings); layout.addView(home); layout.addView(back); layout.addView(observe)
        setContentView(layout)
    }

    override fun onResume() {
        super.onResume()
        status.text = if (LunaAccessibilityService.instance != null) "Luna Android Agent\n\nAccessibility: ATIVA\n\nPronto para o teste no celular." else "Luna Android Agent\n\nAccessibility: DESATIVADA\n\nAtive o serviço para começar."
    }
}
