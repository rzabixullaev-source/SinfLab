export default function TownScene({ theme }) {
  return <svg className="town-scene" viewBox="0 0 420 180" aria-hidden="true" focusable="false">
    <circle className="scene-sun" cx="345" cy="35" r="25" />
    <path className="scene-hill-far" d="M0 115 Q65 60 125 112 Q185 45 260 110 Q330 65 420 120 V180 H0Z" />
    <path className="scene-hill" d="M0 140 Q70 105 135 139 Q210 95 275 140 Q345 105 420 145 V180 H0Z" />
    {theme === "math" ? <g className="scene-structure"><path d="M60 135V86L89 58L118 86V135M145 137V75H204V137M224 137L258 58L292 137Z" /><path d="M74 105H105M159 90H190M159 109H190M245 113H271" /><text x="165" y="67">π</text><circle cx="89" cy="81" r="7" /></g> : null}
    {theme === "physics" ? <g className="scene-structure"><path d="M60 138V92L84 72L108 92V138M238 139V85H293V139" /><ellipse cx="172" cy="91" rx="67" ry="28" transform="rotate(-28 172 91)" /><ellipse cx="172" cy="91" rx="67" ry="28" transform="rotate(28 172 91)" /><circle cx="172" cy="91" r="13" /><circle cx="225" cy="69" r="6" /><path d="M251 103H280M251 116H280" /></g> : null}
    {theme === "chemistry" ? <g className="scene-structure"><path d="M66 138V82H139V138M79 95H126M94 82V61H111V82M184 59V92L156 132Q154 140 163 140H230Q240 140 236 132L207 92V59M183 59H207M175 117H219M269 139V88H318V139" /><circle cx="182" cy="127" r="5" /><circle cx="205" cy="112" r="4" /><circle cx="298" cy="70" r="7" /><circle cx="322" cy="58" r="4" /></g> : null}
    {theme === "biology" ? <g className="scene-structure"><path d="M81 141V85M81 112L52 91M81 105L109 81M187 140V70M187 112L151 87M187 101L220 80M293 140V93" /><circle cx="81" cy="71" r="31" /><circle cx="56" cy="87" r="22" /><circle cx="108" cy="85" r="23" /><circle cx="187" cy="62" r="35" /><circle cx="159" cy="80" r="24" /><circle cx="217" cy="79" r="23" /><circle cx="293" cy="88" r="25" /><path d="M254 142Q278 112 303 142M118 146Q141 119 165 146" /></g> : null}
    {theme === "language" ? <g className="scene-structure"><path d="M58 140V73L121 55L184 73V140M73 85H169M81 99V129M101 96V130M123 95V131M145 96V130M163 99V129M206 139V91L258 70L310 91V139M219 101H298M237 139V111Q258 91 280 111V139" /><path d="M79 135H170M218 139H300" /><text x="113" y="84">A</text></g> : null}
    {theme === "coding" ? <g className="scene-structure"><path d="M60 139V68H126V139M75 82H110M75 98H110M75 114H110M165 139V52H236V139M180 68H221M180 85H221M180 102H221M266 139V82H326V139M282 97H312M282 115H312" /><circle cx="117" cy="127" r="3" /><circle cx="225" cy="121" r="3" /><path d="M125 107H151V78H165M236 111H251V95H266" /></g> : null}
    {theme === "other" ? <g className="scene-structure"><path d="M72 141V83L111 57L150 83V141M184 141V71L219 52L254 71V141M278 141V92L312 71L346 92V141M83 99H140M196 89H242M289 109H335" /><path d="M213 33L219 19L225 33L240 38L225 43L219 57L213 43L198 38Z" /></g> : null}
    <path className="scene-road" d="M160 180Q215 130 270 180" />
  </svg>;
}
