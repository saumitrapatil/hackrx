import Link from 'next/link';
import AuthorSection from '../../components/AuthorSection';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Neural Tangent Kernel Beyond Lazy Training | NS Blog',
    description: 'Understanding what happens beyond the lazy regime - how finite-width networks with finite learning rates actually learn features.',
};

export default function Blog8() {
    return (
        <article className="blog-content">
            <Link href="/" className="back-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Home
            </Link>

            <h1>Neural Tangent Kernel Beyond Lazy Training</h1>

            <h2>Introduction: The Lazy Training Regime and Its Limitations</h2>

            <p>The Neural Tangent Kernel (NTK) theory provides a remarkable lens for understanding neural network training: under certain conditions, training an infinitely wide neural network with gradient descent is equivalent to kernel regression with a fixed, deterministic kernel. This "lazy training" regime offers mathematical tractability—we can analyze neural networks using classical kernel methods.</p>

            <p>However, this theory has critical limitations:</p>

            <ol>
                <li><strong>Infinite width assumption</strong>: Real networks are finite width</li>
                <li><strong>Infinitesimal learning rates</strong>: Practice uses substantial learning rates</li>
                <li><strong>No feature learning</strong>: The kernel remains fixed, meaning the network doesn't learn representations—it merely finds the best linear combination of fixed features</li>
            </ol>

            <p>The most severe limitation is the last: modern deep learning's success stems precisely from feature learning—the ability to discover useful representations during training. Networks in the lazy regime cannot do this; they're essentially fancy linear models in a fixed feature space.</p>

            <p>The central question: what happens beyond the lazy regime? How do finite-width networks with finite learning rates actually learn features? When and why does feature learning outperform the NTK?</p>

            <h2>The NTK: A Brief Review</h2>

            <p>To understand going beyond NTK, we must first understand NTK itself.</p>

            <h3>NTK Definition</h3>

            <p>Consider a neural network f(x; θ) with parameters θ. The Neural Tangent Kernel at initialization is:</p>

            <pre><code>Θ(x, x') = ⟨∂f(x;θ₀)/∂θ, ∂f(x';θ₀)/∂θ⟩</code></pre>

            <p>This kernel measures how network outputs at x and x' change together as we perturb parameters.</p>

            <h3>The Lazy Training Theorem</h3>

            <p><strong>Theorem (NTK Regime)</strong>: For a network of width m → ∞ trained with gradient descent at learning rate η → 0, the kernel Θ(x, x') remains constant during training, and training dynamics follow:</p>

            <pre><code>df(x_i; θ_t)/dt = -η Σ_j Θ(x_i, x_j) × (f(x_j; θ_t) - y_j)</code></pre>

            <p>This is exactly kernel gradient descent with kernel Θ.</p>

            <p><strong>Consequence</strong>: The learned function is:</p>

            <pre><code>f_∞(x) = y^T Θ(X, x)^T [Θ(X, X) + λI]^{'{-1}'}</code></pre>

            <p>identical to kernel ridge regression.</p>

            <h3>Limitations of This Framework</h3>

            <p><strong>No feature adaptation</strong>: Because Θ remains constant, the feature representation ∂f/∂θ doesn't change. The network finds optimal weights for features determined at initialization.</p>

            <p><strong>Linear regime</strong>: In function space, training is linear: f_t = f_0 + linear combination of training points.</p>

            <p><strong>No advantage over kernels</strong>: NTK provides no benefits over classical kernel methods—it's just kernel regression with a particular (complicated) kernel.</p>

            <p>Yet empirically, finite-width networks clearly outperform kernel methods. This gap demands explanation.</p>

            <h2>The Feature Learning Regime</h2>

            <p>Beyond the lazy regime lies feature learning, where the network actively modifies its internal representations.</p>

            <h3>Characterizing Feature Learning</h3>

            <p>Feature learning occurs when:</p>

            <ol>
                <li><strong>Kernel evolution</strong>: Θ(x, x'; θ_t) changes significantly during training</li>
                <li><strong>Representational change</strong>: Intermediate layer activations evolve in structure</li>
                <li><strong>Non-linear dynamics</strong>: Training dynamics in function space are non-linear</li>
            </ol>

            <p><strong>Quantifying feature learning</strong>: Define kernel change as:</p>

            <pre><code>Δ_kernel = ||Θ(X, X; θ_T) - Θ(X, X; θ_0)||_F</code></pre>

            <p>Large Δ_kernel indicates substantial feature learning.</p>

            <h3>When Does Feature Learning Occur?</h3>

            <p><strong>Theorem (Finite Width Enables Feature Learning)</strong>: For a network of width m, kernel movement satisfies:</p>

            <pre><code>Δ_kernel ≥ Ω(T × η² × m^{'{-1}'})</code></pre>

            <p>where T is training time and η is learning rate.</p>

            <p><strong>Interpretation</strong>:</p>
            <ul>
                <li>Infinite width (m → ∞): Δ_kernel → 0 (lazy regime)</li>
                <li>Finite width: Δ_kernel {'>'} 0 (feature learning possible)</li>
                <li>Larger learning rates amplify feature learning</li>
            </ul>

            <p><strong>Consequence</strong>: The lazy regime is a limiting case; any practical network exhibits some feature learning.</p>

            <h3>The Mean-Field Regime</h3>

            <p>An alternative limiting regime: infinite width but with proper scaling that maintains feature learning.</p>

            <p><strong>Mean-Field Scaling</strong>: Rather than standard parameterization, scale weights as:</p>

            <pre><code>W ~ N(0, 1/m) and learning rate η ~ 1/m</code></pre>

            <p><strong>Theorem (Mean-Field Dynamics)</strong>: Under mean-field scaling, as m → ∞, the parameter distribution ρ_t evolves according to:</p>

            <pre><code>∂ρ_t/∂t = -∇ · (ρ_t × ∇E[loss])</code></pre>

            <p>This is a deterministic PDE (continuity equation) describing how the parameter distribution flows.</p>

            <p><strong>Key difference from NTK</strong>: Parameters actively redistribute to minimize loss, enabling representation learning. The network doesn't just interpolate in a fixed feature space—it changes the feature space itself.</p>

            <h2>Theoretical Analysis of Feature Learning</h2>

            <p>To understand feature learning rigorously, we need mathematical tools beyond kernel theory.</p>

            <h3>Effective Rank and Feature Diversity</h3>

            <p>Feature learning can be quantified through the effective rank of learned representations.</p>

            <p><strong>Definition</strong>: For hidden layer activations H ∈ ℝ^{'{n×m}'}, the effective rank is:</p>

            <pre><code>rank_eff(H) = exp(Shannon entropy of singular values)</code></pre>

            <p><strong>Theorem (Feature Learning Increases Rank)</strong>: During training with feature learning:</p>

            <pre><code>d(rank_eff(H_t))/dt ≥ 0</code></pre>

            <p>Feature diversity increases monotonically.</p>

            <p><strong>Contrast with NTK</strong>: In lazy regime, rank_eff(H_t) ≈ rank_eff(H_0) stays constant.</p>

            <h3>Information Geometry of Feature Learning</h3>

            <p>Feature learning can be analyzed through information geometry—studying the manifold of probability distributions the network represents.</p>

            <p><strong>Fisher Information Metric</strong>: At parameters θ, the Fisher information matrix is:</p>

            <pre><code>I(θ) = E[∇_θ log p(y|x; θ) × ∇_θ log p(y|x; θ)^T]</code></pre>

            <p><strong>Theorem (Feature Learning Changes Information Geometry)</strong>: The Fisher information evolves as:</p>

            <pre><code>dI(θ_t)/dt = -2η × E[Hessian(loss) × gradient × gradient^T]</code></pre>

            <p><strong>Interpretation</strong>: Training reshapes the loss landscape geometry. In lazy regime, I(θ) ≈ I(θ_0) is constant. With feature learning, I(θ_t) adapts to data structure.</p>

            <h3>Symmetry Breaking</h3>

            <p>Neural networks have many symmetries (neuron permutation, sign flips). Feature learning breaks these symmetries.</p>

            <p><strong>Theorem (Spontaneous Symmetry Breaking)</strong>: For networks initialized with symmetric parameter distribution, gradient descent breaks symmetry at rate:</p>

            <pre><code>symmetry_breaking_rate ∝ η² × (1/m)</code></pre>

            <p><strong>Mechanism</strong>: Small random fluctuations get amplified by learning dynamics, causing different neurons to specialize differently—a key aspect of feature learning.</p>

            <p><strong>Lazy regime</strong>: η → 0 means symmetry_breaking_rate → 0, neurons remain symmetric (no specialization).</p>

            <h2>When Feature Learning Outperforms NTK</h2>

            <p>Not all tasks benefit equally from feature learning. We can characterize when it's essential.</p>

            <h3>Task Hierarchy and Representation Complexity</h3>

            <p><strong>Definition</strong>: A task has representation complexity k if it can be learned with k-layer network but not (k-1)-layer network.</p>

            <p><strong>Theorem (Feature Learning for Complex Tasks)</strong>: For tasks with representation complexity k {'>'} 1:</p>

            <pre><code>error_NTK ≥ Ω(1/m^{'{k-1}'})
                error_feature_learning ≤ O(1/m^k)</code></pre>

            <p>Feature learning provides asymptotically better sample complexity.</p>

            <p><strong>Example</strong>: XOR function has representation complexity 2 (requires hidden layer). NTK fails to learn XOR efficiently, but two-layer network with feature learning succeeds.</p>

            <h3>Low-Dimensional Structure</h3>

            <p>Many real-world datasets have low-dimensional structure embedded in high-dimensional space.</p>

            <p><strong>Theorem (Feature Learning Discovers Low-Dimensional Structure)</strong>: For data on a d-dimensional manifold in ℝ^D where d {'<<'} D:</p>

            <ul>
                <li>NTK complexity: O(D) (must use ambient dimension)</li>
                <li>Feature learning complexity: O(d) (can discover intrinsic dimension)</li>
            </ul>

            <p>Feature learning achieves exponential advantage when d/D is small.</p>

            <p><strong>Mechanism</strong>: Feature learning adaptively finds the low-dimensional manifold, effectively reducing problem dimensionality. NTK uses fixed features in ambient space.</p>

            <h3>Compositional Structure</h3>

            <p>Tasks with compositional structure (output depends on compositions of simpler functions) benefit enormously from feature learning.</p>

            <p><strong>Theorem (Compositional Learning)</strong>: For targets requiring L-level composition:</p>

            <ul>
                <li>NTK sample complexity: exp(L)</li>
                <li>Feature learning sample complexity: poly(L)</li>
            </ul>

            <p>Feature learning provides exponential advantage.</p>

            <p><strong>Example</strong>: Hierarchical image classification (animal → mammal → dog → breed) has natural compositional structure. Feature learning builds hierarchical representations matching this structure; NTK cannot.</p>

            <h2>Optimization Dynamics in Feature Learning Regime</h2>

            <p>Feature learning changes optimization fundamentally.</p>

            <h3>Loss Landscape Evolution</h3>

            <p>In lazy regime, loss landscape is fixed. With feature learning, the landscape itself evolves.</p>

            <p><strong>Theorem (Landscape Plasticity)</strong>: The Hessian of the loss evolves as:</p>

            <pre><code>dH(θ_t)/dt = -η × ∇³loss × ∇loss + O(η²)</code></pre>

            <p>The loss landscape actively reshapes based on gradients—a form of self-organization.</p>

            <p><strong>Consequence</strong>: Bad local minima can disappear during training, and new good minima can emerge. This provides an explanation for why networks avoid getting stuck despite non-convexity.</p>

            <h3>Critical Learning Rate</h3>

            <p>There's a critical learning rate separating lazy and feature-learning regimes.</p>

            <p><strong>Theorem (Critical Learning Rate)</strong>: Define:</p>

            <pre><code>η_crit = min(1/||H(θ_0)||, √(m)/T)</code></pre>

            <p>For η {'<<'} η_crit: Lazy regime dominates<br />
                For η {'≫'} η_crit: Feature learning dominates</p>

            <p><strong>Interpretation</strong>: To enable feature learning, we need learning rates large enough to substantially modify the kernel within training time T.</p>

            <p><strong>Practical implication</strong>: Common learning rates (η ~ 0.001-0.1) are often in the feature learning regime for realistic network widths (m ~ 100-1000).</p>

            <h3>Implicit Regularization from Feature Learning</h3>

            <p>Feature learning provides implicit regularization beyond what NTK analysis suggests.</p>

            <p><strong>Theorem (Feature Learning Implicit Bias)</strong>: Gradient descent with feature learning biases toward:</p>

            <ol>
                <li><strong>Low-rank features</strong>: Learned representations have low effective rank</li>
                <li><strong>Aligned features</strong>: Features align with task-relevant directions</li>
                <li><strong>Sparse features</strong>: Individual neurons learn sparse activation patterns</li>
            </ol>

            <p>These biases emerge from the learning dynamics and improve generalization.</p>

            <p><strong>Contrast</strong>: NTK has implicit bias (e.g., toward minimum norm solutions) but cannot adapt bias to task structure. Feature learning adapts bias through representation adaptation.</p>

            <h2>Connecting Theory to Practice</h2>

            <p>These theoretical insights explain practical phenomena.</p>

            <h3>Why Over-Parameterization Helps Initially But Not Indefinitely</h3>

            <p><strong>Observation</strong>: Increasing width improves performance up to a point, then saturates.</p>

            <p><strong>Explanation</strong>:</p>
            <ul>
                <li>Modest width: Enables feature learning (good)</li>
                <li>Excessive width: Approaches lazy regime (bad, loses feature learning advantage)</li>
            </ul>

            <p>Optimal width balances expressiveness and feature learning.</p>

            <h3>Why Learning Rate Schedules Matter</h3>

            <p><strong>Observation</strong>: Decaying learning rates improve final performance.</p>

            <p><strong>Explanation</strong>:</p>
            <ul>
                <li>Large initial η: Enable aggressive feature learning, finding good representations</li>
                <li>Smaller final η: Fine-tune within learned feature space, approaching better local minimum</li>
            </ul>

            <p>Two-phase training: feature discovery (large η) + fine-tuning (small η).</p>

            <h3>Why Warmup Helps</h3>

            <p><strong>Observation</strong>: Gradually increasing learning rate at training start improves stability.</p>

            <p><strong>Explanation</strong>:</p>
            <ul>
                <li>Warmup prevents excessive feature movement early when gradients are noisy</li>
                <li>Allows progressive transition from lazy-like regime (stable) to feature-learning regime (expressive)</li>
            </ul>

            <h3>Why Batch Size Affects Generalization</h3>

            <p><strong>Observation</strong>: Larger batches generalize worse than smaller batches at fixed training time.</p>

            <p><strong>Theorem (Batch Size and Feature Learning)</strong>: Effective learning rate for feature learning is:</p>

            <pre><code>η_eff = η × (batch_size)^{'{-α}'}</code></pre>

            <p>where α ∈ [0.5, 1] depends on architecture.</p>

            <p><strong>Consequence</strong>: Large batches suppress feature learning, pushing toward lazy regime. This limits generalization since feature learning provides beneficial implicit regularization.</p>

            <h2>Advanced Topics: Beyond Standard Feature Learning</h2>

            <p>Recent work extends feature learning analysis further.</p>

            <h3>Neural Collapse</h3>

            <p>In final training stages, a phenomenon called "neural collapse" occurs:</p>

            <ol>
                <li>Features of same class collapse to class mean</li>
                <li>Class means form equiangular tight frame</li>
                <li>Last layer weights align with class means</li>
            </ol>

            <p><strong>Theorem (Neural Collapse Geometry)</strong>: Under mild conditions, gradient descent drives features toward the unconstrained features model (UFM) solution:</p>

            <pre><code>H_∞ = Y × (Y^T Y)^{'{-1/2}'}</code></pre>

            <p>where Y is one-hot labels and H is feature matrix.</p>

            <p><strong>Connection to feature learning</strong>: Neural collapse represents an extreme form of feature learning where representations become maximally separated by class—far beyond what NTK could achieve.</p>

            <h3>Multi-Scale Feature Learning</h3>

            <p>Features evolve at different rates in different layers.</p>

            <p><strong>Theorem (Hierarchical Feature Learning)</strong>: For an L-layer network:</p>

            <pre><code>||θ_ℓ(t) - θ_ℓ(0)|| ∝ t^{'{ℓ/L}'}</code></pre>

            <p>Deeper layers learn faster, shallower layers more conservatively.</p>

            <p><strong>Interpretation</strong>: Early layers learn general features (useful across tasks), later layers learn task-specific features. This hierarchical learning is invisible in NTK analysis.</p>

            <h3>Grokking: Delayed Feature Learning</h3>

            <p>Recent work discovered "grokking": networks memorize training data initially, then suddenly generalize much later.</p>

            <p><strong>Theoretical explanation</strong>:</p>
            <ul>
                <li>Phase 1: Lazy-like regime, network memorizes via high-frequency features</li>
                <li>Phase 2: Feature learning kicks in, network discovers low-frequency structure underlying data</li>
                <li>Transition: Sharp phase transition when low-frequency features overcome high-frequency memorization</li>
            </ul>

            <p><strong>Theorem (Grokking Conditions)</strong>: Grokking occurs when:</p>

            <ol>
                <li>Task has low-dimensional structure</li>
                <li>Network is over-parameterized</li>
                <li>Training continues far beyond zero training loss</li>
            </ol>

            <h2>Open Problems and Future Directions</h2>

            <h3>Precise Characterization of Regimes</h3>

            <p>We need sharper boundaries between lazy, feature-learning, and other regimes. What are the exact conditions distinguishing them?</p>

            <h3>Sample Complexity Theory</h3>

            <p>Can we prove tight sample complexity bounds for feature learning? Current bounds are often loose.</p>

            <h3>Optimal Architectures for Feature Learning</h3>

            <p>How should architectures be designed to maximize beneficial feature learning? Are there principled design rules?</p>

            <h3>Connection to Neuroscience</h3>

            <p>Real neural networks in brains clearly do feature learning. Can theoretical insights from artificial feature learning inform neuroscience?</p>

            <h3>Feature Learning in RL</h3>

            <p>Reinforcement learning exhibits feature learning in unique ways (state representation learning). How does theory extend to RL?</p>

            <h2>Conclusion</h2>

            <p>The Neural Tangent Kernel provides a beautiful theory for a limiting regime of neural network training. But this regime—infinite width, infinitesimal learning rates, no feature learning—doesn't describe practical deep learning.</p>

            <p>Real networks live in the feature learning regime: finite width, finite learning rates, actively evolving representations. This regime is:</p>

            <ul>
                <li><strong>More powerful</strong>: Achieves better sample complexity on structured tasks</li>
                <li><strong>More complex</strong>: Dynamics are non-linear, landscape evolves</li>
                <li><strong>More interesting</strong>: Exhibits phenomena like symmetry breaking, neural collapse, grokking</li>
            </ul>

            <p>Understanding feature learning requires going beyond kernel methods to analyze the full non-linear dynamics of gradient descent in parameter space. Recent progress using mean-field theory, information geometry, and dynamical systems theory provides the foundations.</p>

            <p>The future of deep learning theory lies not in showing neural networks are fancy kernel machines, but in characterizing how they learn representations—how they discover structure in data through the interplay of architecture, optimization, and implicit biases. This is the frontier where theory can guide practice toward more effective, efficient, and understandable deep learning systems.</p>

            <AuthorSection />
        </article>
    );
}
