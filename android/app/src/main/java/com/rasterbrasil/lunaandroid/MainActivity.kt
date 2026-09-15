package com.rasterbrasil.lunaandroid

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var input: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }
        status = TextView(this).apply { textSize = 18f }
        input = EditText(this).apply {
            hint = "Campo para teste de digitação"
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }

        val settings = button("Ativar acessibilidade da Luna") {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
        val observe = button("Teste: observar tela") { showObservation() }
        val home = button("Teste: Luna → Tela inicial") { runAction { it.home() } }
        val back = button("Teste: Luna → Voltar") { runAction { it.back() } }
        val recents = button("Teste: Luna → Aplicativos recentes") { runAction { it.recents() } }
        val tap = button("Teste: tocar no botão abaixo") {
            runAction { it.clickByText("BOTÃO DE TESTE") }
        }
        val type = button("Teste: Luna → digitar") {
            input.requestFocus()
            runAction { it.type("Olá, eu sou a Luna.") }
        }
        val url = button("Teste: Luna → abrir página") {
            runAction { it.openUrl("https://example.com") }
        }

        layout.addView(status)
        layout.addView(settings)
        layout.addView(observe)
        layout.addView(home)
        layout.addView(back)
        layout.addView(recents)
        layout.addView(input)
        layout.addView(type)
        layout.addView(tap)
        layout.addView(Button(this).apply { text = "BOTÃO DE TESTE"; isAllCaps = false })
        layout.addView(url)
        setContentView(layout)
    }

    override fun onResume() {
        super.onResume()
        status.text = if (LunaAccessibilityService.instance != null) {
            "Luna Android Agent\n\nAccessibility: ATIVA\n\nCamada Android pronta para teste."
        } else {
            "Luna Android Agent\n\nAccessibility: DESATIVADA\n\nAtive o serviço para começar."
        }
    }

    private fun showObservation() {
        status.text = LunaAccessibilityService.instance?.observe()?.toString(2)
            ?: "AccessibilityService não está ativo."
    }

    private fun runAction(action: (LunaAccessibilityService) -> Boolean) {
        val service = LunaAccessibilityService.instance
        status.text = when {
            service == null -> "AccessibilityService não está ativo."
            action(service) -> "Luna executou a ação com sucesso."
            else -> "A ação foi recusada ou não encontrou o alvo."
        }
    }

    private fun button(label: String, action: () -> Unit) = Button(this).apply {
        text = label
        setOnClickListener { action() }
    }
}
