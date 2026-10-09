# Module 01: Big-O and Complexity Analysis

**Time:** ~1.5 weeks (6–7 hrs)
**Prerequisites:** Module 00
**You'll need:** Python 3.12+, your `dsa-journey` repo, and pen and paper for the recursion trees (really; drawing them is the skill)

---

## 1. Why it matters (the backend analogy)

You've seen this bug before. An endpoint is fast in staging with 200 rows, then times out in production with 2 million. Nothing in the code changed; only **n** did. Big-O is the language for describing exactly that: *how cost grows as the input grows.*

You already have strong instincts for this. They just use database words:

| Backend (what you know) | Complexity (what you'll learn) |
|---|---|
| Full table scan (`WHERE email = ?` with no index) | O(n): linear search |
| B-tree index lookup | O(log n): binary search over a tree |
| Redis `GET` / hash index lookup | O(1) on average: hash table |
| N+1 queries: 1 query for the list, then 1 per item | O(n) network round trips |
| Batched `WHERE id IN (...)` / DataLoader | O(1) round trips |
| Nested-loop join with no index | O(n · m) |
| Hash join | O(n + m), the same idea as Two Sum with a hash map |
| `ORDER BY` on an unindexed column | O(n log n): a sort |
| `OFFSET 100000 LIMIT 20` | O(offset): the DB walks past 100,000 rows to throw them away |
| Go slice / JS array growth, Redis rehashing | Amortized O(1): usually cheap, occasionally expensive |
| A cache in front of a slow service | Trading space for time: memoization |

Everything in DSA is built on this module. Every data structure is a set of operations with costs, and every algorithm question in an interview ends with "what's the time and space complexity?" If you're shaky here, everything later feels arbitrary. If you're solid here, you'll *derive* solutions from the constraints.

---

## 2. Concepts

### 2.1 What we're actually measuring

We don't measure seconds. Seconds depend on the machine, the language, the cache, and what else is running. Instead we count **basic steps** (a comparison, an assignment, an arithmetic operation, an array index) as a function of the **input size n**, and then we only care about **how that count grows**.

Look at how fast the classes pull apart:

| n | log₂ n | n | n log₂ n | n² | 2ⁿ |
|---|---|---|---|---|---|
| 10 | 3.3 | 10 | 33 | 100 | 1,024 |
| 100 | 6.6 | 100 | 664 | 10,000 | 1.3 × 10³⁰ |
| 1,000 | 10 | 1,000 | ~10⁴ | 10⁶ | ~10³⁰¹ |
| 1,000,000 | 20 | 10⁶ | 2 × 10⁷ | 10¹² | forget it |

Pure Python runs roughly **10⁷ simple operations per second** (C, C++, and Go are 10–100× faster). So with n = 10⁶:
- O(n log n) is about 2 × 10⁷ steps: **about 2 seconds** in a pure Python loop (and much faster with `sorted()`, which runs in C).
- O(n²) is 10¹² steps: **about 28 hours.**

No micro-optimization closes that gap. Only a better algorithm does. That's why we care about growth rate more than anything else.

### 2.2 The formal definitions

**Big-O (an upper bound).** f(n) = O(g(n)) means there are constants c > 0 and n₀ such that:

> f(n) ≤ c · g(n) for all n ≥ n₀

In plain words: *past some input size, f never grows faster than g, up to a constant factor.*

Example: f(n) = 3n² + 10n + 50. Is it O(n²)? For n ≥ 1 we know 10n ≤ 10n² and 50 ≤ 50n², so f(n) ≤ 3n² + 10n² + 50n² = 63n². With c = 63 and n₀ = 1, the definition holds. **f(n) = O(n²).** (A tighter c works too. For example, c = 4 works from n₀ = 14 on.)

The other two you should know:

| Notation | Meaning | Analogy |
|---|---|---|
| **O(g)**: Big-O | Upper bound: grows **at most** like g | "≤" |
| **Ω(g)**: Big-Omega | Lower bound: grows **at least** like g | "≥" |
| **Θ(g)**: Big-Theta | Tight bound: both O(g) and Ω(g) | "=" |

Strictly speaking, binary search is O(log n), and also O(n) and O(n²), because those are all valid upper bounds. That isn't useful, though. **In interviews and in industry, "Big-O" means the tightest bound you can give**, which is really Θ. Say "binary search is O(log n)", never "O(n)".

### 2.3 Simplification rules

1. **Drop constant factors.** O(3n) → O(n). O(n/2) → O(n). Constants depend on the hardware and the language; growth doesn't.
2. **Drop lower-order terms.** O(n² + n) → O(n²). At n = 10⁶ the n term is 0.0001% of the total.
3. **Keep independent inputs separate.** Two arrays of sizes n and m are **O(n + m)** or **O(n · m)**, not O(n) or O(n²). A grid is O(rows · cols). A graph is O(V + E). Collapsing them loses information. Interviewers notice.
4. **Log bases don't matter.** log₂ n and log₁₀ n differ only by a constant factor (log₂ n = log₁₀ n / log₁₀ 2 ≈ 3.32 · log₁₀ n). So we just write O(log n).

**But constants do matter in practice.** An O(1) operation that makes a 50 ms network call loses to an O(log n) in-memory lookup at any realistic n. Big-O compares *growth*; it doesn't say which is faster at a particular n. For small n (say < 50), a "worse" algorithm with a tiny constant often wins. That's why Python's sort uses insertion sort on small runs. Use Big-O to rule out approaches that can't scale, then think about constants.

### 2.4 The complexity ladder

| Class | Name | Typical DSA example | Backend example |
|---|---|---|---|
| O(1) | Constant | Array index, hash map get, stack push | Redis `GET`, reading a config value |
| O(log n) | Logarithmic | Binary search, balanced BST lookup, heap push | B-tree index lookup |
| O(√n) | Square root | Checking whether n is prime by trial division | (rare) |
| O(n) | Linear | One pass over an array, hash-map counting | Full table scan, streaming a file once |
| O(n log n) | Linearithmic | Sorting, n heap operations | `ORDER BY` without an index, external merge sort |
| O(n²) | Quadratic | All pairs, nested loops, naive dedupe | Nested-loop join without an index |
| O(n³) | Cubic | Triple loops, Floyd-Warshall, interval DP | (rare, and usually a bug) |
| O(2ⁿ) | Exponential | All subsets, naive recursive Fibonacci | Trying every combination of feature flags |
| O(n!) | Factorial | All permutations | Brute-forcing a delivery route over n stops |

Memorize this ordering: **1 < log n < √n < n < n log n < n² < n³ < 2ⁿ < n!**

### 2.5 Best, worst, and average case

The same algorithm can cost different amounts on different inputs of the same size.

```python
def linear_search(nums: list[int], target: int) -> int:
    for i, x in enumerate(nums):
        if x == target:
            return i
    return -1
```

- **Best case:** the target is at index 0, so O(1). This is almost never useful. Every algorithm is fast on its luckiest input.
- **Worst case:** the target is last or missing, so O(n). **This is the default**: when someone says "linear search is O(n)", they mean the worst case.
- **Average case:** assuming the target is equally likely to be at any position, you check about n/2 elements on average. That's still O(n).

Where the distinction really matters:

| Algorithm / structure | Average | Worst | Why they differ |
|---|---|---|---|
| Hash map get/set | O(1) | O(n) | If many keys collide in one bucket, a lookup scans them all |
| Quicksort | O(n log n) | O(n²) | A bad pivot (e.g., always the smallest) splits n into 0 and n−1 |
| Unbalanced BST lookup | O(log n) | O(n) | Inserting sorted data makes the tree a linked list |

**What to say in an interview:** for hash maps, say "O(1) on average". Everyone assumes that. For quicksort, say "O(n log n) on average, O(n²) worst case". That shows you know the difference.

**The backend connection:** the hash map worst case isn't just theoretical. In 2011, "hash flooding" attacks sent web servers POST bodies full of keys crafted to collide, turning every parameter lookup into O(n) and a single request into seconds of CPU. That's why Python (since 3.3) randomizes string hashing per process: you'll see `hash("abc")` change between runs. The average case only holds if inputs aren't adversarial.

### 2.6 Amortized analysis: why `list.append` is O(1)

A Python `list` is a **dynamic array**: a contiguous block of memory with some spare capacity at the end.

- When there's spare capacity, `append` writes into the next slot. That's O(1).
- When it's full, `append` must **allocate a bigger block and copy every element over**. That's O(n) for that one append.

So how can we call `append` O(1)? Because the expensive appends are rare enough that their cost, **spread over all the appends**, is a constant per append. That's **amortized** O(1).

#### The proof, with doubling

Say capacity doubles whenever the array is full: 1 → 2 → 4 → 8 → .... Do n appends:

```
append #:   1   2   3   4   5   6   7   8   9  ...
capacity:   1   2   4   4   8   8   8   8  16  ...
copies:     0   1   2   0   4   0   0   0   8  ...
```

- Every append writes one element: **n writes** in total.
- The copies happen at sizes 1, 2, 4, 8, ... up to below n: 1 + 2 + 4 + ... + 2ᵏ < **2n copies** in total (a geometric series sums to less than twice its last term, which is < n).
- Total work < n + 2n = **3n**. Over n appends, that's **< 3 per append: O(1) amortized**.

**Another way to see it (the "banking" view):** charge every append 3 coins. One coin pays for its own write; two go into the bank. Right after a resize to capacity 2m, the array holds m items. By the time it's full again, m new items have each banked 2 coins, so there are 2m coins: exactly enough to copy all 2m items into the next block. The bank never goes negative, so 3 coins per append always covers the cost.

#### What CPython actually does

CPython doesn't double. It grows by about **12.5% plus a small constant**. You can watch it (Drill D2):

```
len:       1   5   9  17  25  33  41  53  65  77  93 ...
capacity:  4   8  16  24  32  40  52  64  76  92 108 ...
```

Any **geometric** growth factor r > 1 gives amortized O(1). The total copies are about n · (1 + 1/r + 1/r² + ...) = n · r/(r − 1). With r = 2 that's 2n. With r = 1.125 it's 9n: more copying, but less wasted memory. I measured 10⁶ appends in CPython 3.12: 86 resizes and **about 8.4 copies per append**. That's a constant, so it's O(1) amortized.

**What doesn't work:** growing by a *fixed amount* (+100 slots each time). Then resizes happen at 100, 200, 300, ..., and the copies total 100 + 200 + ... + n ≈ n²/200, which is O(n) per append. **The growth must be multiplicative.**

#### Amortized vs average: they're different things

| | Amortized | Average |
|---|---|---|
| What it averages over | A **sequence of operations** on one structure | **Random inputs** (a probability distribution) |
| Is it a guarantee? | Yes. *Any* sequence of n appends costs O(n) total, with no luck involved | No. A bad input (e.g., adversarial hash keys) can be slow every time |
| Example | `list.append`, hash map resizing | Hash map lookup, quicksort |

#### Why amortized matters on the backend

Amortized O(1) still means **one specific operation can take O(n)**. In a request handler, that's a latency spike: the p99 request that happened to trigger the resize. Redis knows this. When its hash table needs to grow, it **rehashes incrementally**, moving a few buckets on each subsequent operation instead of all at once, so no single command stalls the server. That's the same total work, spread out to protect tail latency. Remember this when someone says "it's O(1) amortized, so it's fine".

### 2.7 Time vs space

**Space complexity** is how much *extra* memory the algorithm uses as a function of n.

- **Auxiliary space** is the extra memory beyond the input. This is what people usually mean, and what you should state. Say "O(1) extra space", not "O(n) space" just because the input is n.
- **The output** usually isn't counted (returning n results is unavoidable). If it matters, say so: "O(1) extra space, not counting the output."
- **The recursion stack counts.** A recursive function that goes n calls deep uses O(n) space even if it allocates nothing. This is the most commonly forgotten cost.

```python
def reverse_copy(nums):          # O(n) time, O(n) extra space: builds a new list
    return nums[::-1]

def reverse_in_place(nums):      # O(n) time, O(1) extra space: two pointers swap
    l, r = 0, len(nums) - 1
    while l < r:
        nums[l], nums[r] = nums[r], nums[l]
        l, r = l + 1, r - 1

def has_dup_set(nums):           # O(n) time, O(n) space
    return len(set(nums)) != len(nums)

def has_dup_sort(nums):          # O(n log n) time, O(n) extra space: sorted() copies, and Timsort's merge buffer is O(n) too
    nums = sorted(nums)
    return any(a == b for a, b in zip(nums, nums[1:]))
```

Note the last one. In many textbooks, "sorting in place" is treated as O(1) or O(log n) extra space (heapsort, or quicksort's stack). **Python's Timsort uses up to O(n) auxiliary memory** for merging. If an interviewer asks for O(1) space and you call `.sort()`, say this out loud. Most will accept it, but they'll notice that you knew.

**The time–space trade-off** is the most common optimization move in DSA, and you already use it every day:

| Spend memory... | ...to save time | Backend version |
|---|---|---|
| A hash set of seen items | O(n²) → O(n) duplicate detection | A unique index |
| A memo table | Exponential → polynomial recursion | A read-through cache |
| A prefix-sum array | O(n) → O(1) range sums | A precomputed rollup/materialized view |
| A sorted copy | O(n) → O(log n) lookups | A B-tree index (disk space for query speed) |

### 2.8 Analyzing iterative code

Work from the inside out. Count how many times the innermost line runs.

**Rule 1: sequential blocks add.**
```python
for x in nums: ...        # n
for x in nums: ...        # n
for y in other: ...       # m
# O(2n + m) = O(n + m)
```
Two loops one after another are **not** O(n²). This is a very common beginner mistake.

**Rule 2: nested loops multiply.**
```python
for x in nums:            # n times
    for y in nums:        # n times each
        ...               # runs n · n times → O(n²)
```

**Rule 3: dependent nested loops. Do the sum.**
```python
for i in range(n):
    for j in range(i + 1, n):   # runs n-1, n-2, ..., 1, 0 times
        ...
# total = (n-1) + (n-2) + ... + 0 = n(n-1)/2 → O(n²)
```
Even though the inner loop shrinks, it's still half of n², which is O(n²). "All pairs" is always O(n²).

**Rule 4: a loop variable that multiplies or divides gives O(log n).**
```python
i = 1
while i < n:
    i *= 2      # 1, 2, 4, 8, ...: reaches n after log₂ n steps → O(log n)

while n > 1:
    n //= 2     # n, n/2, n/4, ...: also O(log n)
```

**Rule 5: a constant inner loop is still linear.**
```python
for x in nums:
    for d in range(26):   # 26 is a constant, not n
        ...
# O(26n) = O(n)
```
This shows up constantly with "for each letter of the alphabet" and "for each of the 4 grid directions".

**Rule 6: hidden loops count.** Every built-in call inside a loop has its own cost (see 2.11).
```python
for x in nums:
    if x in other_list:   # O(m) hidden scan
        ...
# O(n · m), not O(n)
```

**Rule 7: amortized pointer movement. Count the total, not per iteration.**
```python
left = 0
for right in range(len(nums)):          # n iterations
    window_sum += nums[right]
    while window_sum > limit:           # looks like a nested loop...
        window_sum -= nums[left]
        left += 1
```
This looks O(n²), but it's **O(n)**. `left` only ever moves forward, and it can move at most n times *across the whole run*, so the `while` body runs at most n times in total. The total work is n (for `right`) + n (for `left`) = O(n). This argument is the backbone of sliding window (Module 05) and two pointers (Module 04). **When a nested loop's inner pointer never resets, count its total movement.**

**Rule 8: harmonic sums give O(n log n).**
```python
for i in range(1, n + 1):
    for j in range(0, n, i):   # runs n/i times
        ...
# total = n/1 + n/2 + n/3 + ... + n/n = n · (1 + 1/2 + ... + 1/n) ≈ n · ln n → O(n log n)
```
This is rarer, but it's how the Sieve of Eratosthenes is analyzed.

### 2.9 Building intuition for log n

**log₂ n answers one question: "how many times can I halve n before I reach 1?"** (Or equivalently, "how many times must I double 1 to reach n?")

| n | log₂ n |
|---|---|
| 1,000 | ~10 |
| 1,000,000 | ~20 |
| 1,000,000,000 | ~30 |
| 2⁶⁴ (every 64-bit integer) | 64 |

So binary search over a billion sorted items takes about **30 comparisons**. That's why logarithmic algorithms feel like magic: multiplying the data by 1000 adds only about 10 steps.

Where logs come from:
- **Halving the search space:** binary search, and binary search on the answer.
- **The height of a balanced tree:** a balanced binary tree with n nodes has height about log₂ n. Heaps and balanced BSTs are O(log n) per operation because of this.
- **Divide and conquer depth:** merge sort splits until it reaches size 1, which takes log₂ n levels.
- **Repeated doubling:** a dynamic array resizes about log n times over n appends.
- **The number of digits:** n has about log₁₀ n decimal digits (and log₂ n bits). "Loop over the digits of n" is O(log n).

**The database connection:** a B-tree index node holds hundreds of keys, not 2, so its height is log₍fanout₎ n instead of log₂ n. With a fanout around 500, 500³ = 1.25 × 10⁸ and 500⁴ ≈ 6 × 10¹⁰. So **an index over hundreds of millions of rows is only 3–4 levels deep**, and the top levels stay cached in memory. That's why an indexed lookup feels like O(1) even though it's O(log n).

### 2.10 Analyzing recursive code: recursion trees

For recursion, ask two questions:

- **Time** = the total work across **all calls** = (number of calls) × (work per call), when the work per call is uniform. Otherwise, sum the work level by level in a **recursion tree**.
- **Space** = the **maximum depth** of the call stack × the space per frame, plus any data each frame keeps alive.

You'll often write the cost as a **recurrence**: T(n) = (cost of the recursive calls) + (work done in this call).

#### Example A: linear recursion

```python
def total(nums: list[int], i: int = 0) -> int:
    if i == len(nums):
        return 0
    return nums[i] + total(nums, i + 1)
```

T(n) = T(n − 1) + O(1). That's n calls, each doing O(1) work, so the **time is O(n)**. The calls stack up n deep, so the **space is O(n)**. (And in Python it crashes for n > ~1000. See Module 00.)

#### Example B: the same function, with slicing (a trap)

```python
def total(nums: list[int]) -> int:
    if not nums:
        return 0
    return nums[0] + total(nums[1:])     # nums[1:] copies n-1 elements
```

T(n) = T(n − 1) + O(n), since each call copies its slice. The total copying is n + (n−1) + ... + 1 = **O(n²) time**. Worse, every frame's slice stays alive until that frame returns, so at maximum depth the stack holds slices of size n, n−1, ..., 1 at once: **O(n²) space**. It's one innocent-looking `[1:]`.

#### Example C: binary search, and the slicing trap again

```python
def bs(nums, target, lo, hi):            # indices: no copying
    if lo > hi:
        return -1
    mid = (lo + hi) // 2
    if nums[mid] == target:
        return mid
    if nums[mid] < target:
        return bs(nums, target, mid + 1, hi)
    return bs(nums, target, lo, mid - 1)
```

T(n) = T(n/2) + O(1). That's log n levels with O(1) each: **O(log n) time, O(log n) stack space** (O(1) if written as a loop).

If you write it with slices instead (`bs(nums[mid+1:], target)`), it becomes T(n) = T(n/2) + O(n). The work is n + n/2 + n/4 + ... < 2n = **O(n)**. Slicing silently turned your binary search into a linear scan.

#### Example D: naive Fibonacci (exponential)

```python
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

The recursion tree for `fib(5)`:

```
                      fib(5)
               /                 \
           fib(4)                fib(3)
          /      \              /      \
      fib(3)    fib(2)      fib(2)    fib(1)
      /    \    /    \      /    \
  fib(2) fib(1) fib(1) fib(0) fib(1) fib(0)
  /    \
fib(1) fib(0)
```

That's 15 calls for n = 5. Each call branches into up to 2 calls, and the tree is up to n levels deep, so there are at most about **2ⁿ calls → O(2ⁿ) time**. (The tight bound is Θ(φⁿ), with φ ≈ 1.618, the golden ratio, because the right side of the tree is shallower. Saying O(2ⁿ) is fine in interviews.) **The space is O(n)**: only one root-to-leaf path is on the stack at a time, and the deepest path has n frames.

Look at the tree again: `fib(3)` is computed twice and `fib(2)` three times. **Repeated subproblems** are the signal that you need memoization:

```python
from functools import cache

@cache
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

Now each `fib(k)` for k = 0..n is computed once, with O(1) work each: **O(n) time, O(n) space** (the cache plus the stack). That jump from exponential to linear is the entire idea behind dynamic programming (Module 17).

#### Example E: merge sort, O(n log n)

```python
def merge_sort(nums: list[int]) -> list[int]:
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    left = merge_sort(nums[:mid])
    right = merge_sort(nums[mid:])
    return merge(left, right)        # O(len(left) + len(right))
```

T(n) = 2T(n/2) + O(n). Draw it level by level:

```
level 0:            [ n ]                     work: n
level 1:       [n/2]     [n/2]                work: n/2 + n/2 = n
level 2:   [n/4] [n/4] [n/4] [n/4]            work: 4 · n/4 = n
  ...
level log n: [1][1][1] ... [1]   (n leaves)   work: n
```

Every level does O(n) total work (slicing plus merging), and there are log₂ n levels: **O(n log n) time.** The slices on the current path total n + n/2 + n/4 + ... < 2n, and the merge output is O(n), so the **space is O(n)**.

#### Example F: visiting every node of a tree, O(n)

```python
def count(n: int) -> int:     # think: visit a balanced tree with n nodes
    if n <= 1:
        return 1
    return 1 + count(n // 2) + count(n // 2)
```

T(n) = 2T(n/2) + O(1). The levels have 1, 2, 4, ..., n calls, each doing O(1) work: 1 + 2 + 4 + ... + n < 2n = **O(n)**. Compare this with merge sort: same branching, but O(1) work per call instead of O(n), so the log n factor disappears.

For any tree traversal (Module 12), the time is O(n) because each node is visited once. The space is O(h), where h is the height: O(log n) for a balanced tree, but **O(n) for a skewed one** (a "tree" that's really a linked list).

#### Example G: generating all subsets, O(2ⁿ)

At each element you branch twice (take it or skip it), with n levels of depth. That's 2ⁿ leaves. Copying each finished subset (up to n items) into the output gives **O(n · 2ⁿ) time**. You'll write it properly in Module 14.

#### Recurrence cheat sheet

| Recurrence | Example | Result |
|---|---|---|
| T(n) = T(n−1) + O(1) | Linear recursion | O(n) |
| T(n) = T(n−1) + O(n) | Selection sort, recursion with slicing | O(n²) |
| T(n) = T(n/2) + O(1) | Binary search | O(log n) |
| T(n) = T(n/2) + O(n) | Quickselect (average), binary search with slicing | O(n) |
| T(n) = 2T(n/2) + O(1) | Tree traversal | O(n) |
| T(n) = 2T(n/2) + O(n) | Merge sort, quicksort (average) | O(n log n) |
| T(n) = 2T(n−1) + O(1) | Subsets, Tower of Hanoi, naive Fibonacci (roughly) | O(2ⁿ) |
| T(n) = n · T(n−1) + O(1) | Permutations | O(n!) |

**The quick rule of thumb:** a recursion with **b branches per call** and **depth d** has up to **b^d calls**. Multiply by the work per call.

**Optional: the Master Theorem.** For T(n) = a·T(n/b) + O(n^d), compare d with log_b(a):
- d > log_b(a) → O(n^d): the top level dominates.
- d = log_b(a) → O(n^d · log n): every level costs the same (merge sort: a = 2, b = 2, d = 1).
- d < log_b(a) → O(n^(log_b a)): the leaves dominate (tree traversal: a = 2, b = 2, d = 0 → O(n)).

You don't need it for interviews. The recursion-tree method gives the same answers and is easier to explain out loud.

### 2.11 Python's built-in costs, and the traps

The full table is in [Module 00 §2.20](00-python-for-dsa.md#220-the-cost-cheat-sheet). Here are the traps that turn O(n) solutions into O(n²) ones without anyone noticing:

**Trap 1: `in` on a list inside a loop**
```python
def common(a, b):
    return [x for x in a if x in b]        # O(n · m): b is a list, so each `in` is a scan

def common(a, b):
    b_set = set(b)                         # O(m), once
    return [x for x in a if x in b_set]    # O(n): O(n + m) total
```
This is the full-table-scan-in-a-loop bug. Build the "index" (the set) once.

**Trap 2: `list.pop(0)` and `list.insert(0, x)`**
```python
while queue:
    node = queue.pop(0)       # O(n) each → BFS becomes O(n²)
```
Fix: `collections.deque` and `popleft()`, which is O(1).

**Trap 3: string concatenation in loops**
Strings are immutable, so `s = s + c` must, *in principle*, copy all of `s` every time: 1 + 2 + ... + n = O(n²).

In practice, CPython has an optimization: if `s` has no other references, `s += c` can grow the string in place, which often makes appending linear. **Don't rely on it.** It's an implementation detail. It doesn't apply in PyPy or when another variable references the string, and it never helps **prepending**. Here are my measurements on CPython 3.12:

| n characters | `s += "x"` (append) | `s = "x" + s` (prepend) |
|---|---|---|
| 20,000 | 0.008 s | 0.031 s |
| 40,000 | 0.017 s | 0.097 s |
| 80,000 | 0.021 s | 0.43 s (doubling n → ~4× time: quadratic) |

Fix: collect the parts in a list and call `"".join(parts)` once: guaranteed O(total length). For prepending, append to a list and reverse it, or use a `deque`.

**Trap 4: slicing creates copies**
```python
for i in range(len(nums)):
    rest = nums[i + 1:]           # O(n − i) copy each time → O(n²) total

def is_pal(s):
    if len(s) < 2: return True
    return s[0] == s[-1] and is_pal(s[1:-1])    # O(n²) time and space
```
Fix: pass indices (`lo`, `hi`) instead of slices. Note that `zip(nums, nums[1:])` costs one O(n) copy. That's fine once, but not inside a loop.

**Trap 5: recomputing aggregates in a loop**
```python
running = [sum(nums[:i + 1]) for i in range(len(nums))]   # O(n²)
best = [max(nums[i:]) for i in range(len(nums))]          # O(n²)
```
Fix: carry the running value forward (a prefix sum or running max): O(n). Module 06.

**Trap 6: list concatenation in a loop**
```python
result = []
for x in nums:
    result = result + [x]   # builds a NEW list each time → O(n²)
    # result += [x]  ← this one is fine: += on a list extends in place (amortized O(1))
```

**Trap 7: `x in d.values()`, `list(d.keys())[0]`, `set(...)` inside a loop**
These are all O(n) per call. Hoist anything that doesn't change out of the loop.

| Trap | Cost in a loop of n | Fix | Fixed cost |
|---|---|---|---|
| `x in some_list` | O(n²) | Build a `set` once | O(n) |
| `q.pop(0)` / `insert(0, x)` | O(n²) | `deque.popleft()` / `appendleft()` | O(n) |
| `s = c + s` | O(n²) | `parts.append`, then reverse and `"".join` | O(n) |
| `nums[i:]` in a loop or recursion | O(n²) | Pass indices | O(n) |
| `sum(nums[:i])`, `max(nums[i:])` | O(n²) | A running prefix/suffix value | O(n) |
| `res = res + [x]` | O(n²) | `res.append(x)` | O(n) |
| `x in d.values()` | O(n²) | `set(d.values())` once | O(n) |
| `bisect.insort` n times | O(n²) | `sorted()` once at the end, or a heap | O(n log n) |

### 2.12 Reading the constraints: what complexity do you need?

Every LeetCode problem lists **constraints**, like `1 <= nums.length <= 10^5`. They're the biggest hint in the problem, and most beginners ignore them.

The logic: the judge allows roughly **10⁷–10⁸ basic operations** in total (somewhat fewer for pure Python, which is slow; LeetCode gives Python extra time on many problems, but don't count on that). So plug n into each complexity and see what fits:

| Constraint on n | Max complexity that fits | What it suggests |
|---|---|---|
| n ≤ 10 | O(n!), O(n · n!) | Try every permutation; brute-force backtracking |
| n ≤ 20 | O(2ⁿ), O(n · 2ⁿ) | All subsets; bitmask DP; backtracking |
| n ≤ 100–500 | O(n³) | Triple loops; interval DP; Floyd-Warshall (in pure Python, O(n³) is comfortable only up to n ≈ 200) |
| n ≤ 1,000–5,000 | O(n²) | All pairs; 2D DP (e.g., two strings of length 1000 → O(n·m) = 10⁶) |
| n ≤ 10⁵–10⁶ | **O(n log n) or O(n)** | Sorting, heaps, binary search, hashing, two pointers, sliding window, prefix sums |
| n up to 10⁹ or more | O(log n), O(√n), O(1) | Binary search, math. You can't even loop to n |

**n ≤ 10⁵ is the most common constraint in interviews.** It means "O(n²) is too slow (10¹⁰ steps), so find O(n log n) or O(n)". When you see it, your brute force is your *starting point*, not your answer.

**Read the constraints on values as well as lengths:**
- `0 <= nums[i] <= 100`: values are tiny, so a **counting array** of size 101 can replace sorting or hashing: O(n + 100).
- `1 <= piles[i] <= 10^9`, "find the minimum speed/capacity such that...": the answer lies in a range of size 10⁹, which is the signal for **binary search on the answer**: O(n · log 10⁹) ≈ O(30n). (Module 10.)
- `s` consists of lowercase English letters: there are 26 possible characters, so a fixed-size count array and "O(26n) = O(n)".
- A follow-up like "can you do it in O(1) extra space?" tells you a hash map isn't the intended final answer.

**The Best Conceivable Runtime (BCR):** before optimizing, ask what the *lower bound* is. If you have to look at every element at least once, you can't beat O(n). If your solution is O(n log n) and the BCR is O(n), there might be a better solution. If you're already at the BCR, stop optimizing time and look at space.

### 2.13 Complexity on the backend

Big-O counts *operations*, and **you choose which operation matters**. For in-memory code, that's CPU steps. For a backend, it's often **network round trips** or **disk page reads**, which are 10³–10⁶ times more expensive than a CPU step.

#### N+1 queries: O(n) round trips

```ts
// Express + an ORM: the classic
const orders = await db.query("SELECT * FROM orders LIMIT 500");        // 1 query
for (const o of orders) {
  o.user = await db.query("SELECT * FROM users WHERE id = $1", [o.user_id]);  // N queries
}
```

That's **1 + N round trips**: O(n) in the operation that dominates. At ~1 ms per round trip inside a data center, 500 orders take ~500 ms of pure waiting. The fix:

```ts
const ids = [...new Set(orders.map(o => o.user_id))];
const users = await db.query("SELECT * FROM users WHERE id = ANY($1)", [ids]);  // 1 query
const byId = new Map(users.map(u => [u.id, u]));                                // O(u) index
for (const o of orders) o.user = byId.get(o.user_id);                           // O(n) join
```

That's **2 round trips: O(1)** in round trips, and O(n + u) CPU. The database still reads O(n) rows; what changed is that the expensive constant (a network hop) went from per item to per batch. GraphQL's **DataLoader** automates exactly this.

Look at the last two lines: building a `Map` and then looking up each order is a **hash join**. If you'd written `users.find(u => u.id === o.user_id)` inside the loop, the in-memory join would be O(n · u). That's Trap 1, in TypeScript.

#### Scans vs indexes

| Query | Without an index | With a B-tree index |
|---|---|---|
| `WHERE email = ?` | O(n): full table scan | O(log n): 3–4 page reads |
| `WHERE created_at BETWEEN ? AND ?` | O(n) | O(log n + k) for k matching rows |
| `ORDER BY created_at LIMIT 20` | O(n log n) sort (or O(n log k) top-k) | O(log n + 20): read the index in order |
| `OFFSET 100000 LIMIT 20` | O(offset + 20) | **Still O(offset + 20)**: the DB walks the index and discards rows |
| Keyset: `WHERE id > :last_id ORDER BY id LIMIT 20` | O(n) | O(log n + 20): seek, then read |

A hash index (or Redis) gives O(1) average lookups, but **can't answer range queries or ordering**, because hashing destroys order. That's the same trade-off as `dict` vs a sorted list with `bisect`.

#### Joins are DSA patterns

| Join algorithm | Complexity | The DSA pattern it is |
|---|---|---|
| Nested-loop join | O(n · m) | Brute-force all pairs |
| Index nested-loop join | O(n log m) | For each item, binary search (a B-tree seek) |
| Hash join | O(n + m) | Build a hash map of one side, probe with the other (**Two Sum**) |
| Merge join on sorted inputs | O(n + m) (+ sorting if needed) | **Two pointers** over two sorted lists (the merge step of merge sort) |

Your database's query planner chooses between these using exactly the complexity reasoning in this module.

### 2.14 Common mistakes

| Mistake | Correction |
|---|---|
| "Two loops = O(n²)" | Only if they're **nested**. Sequential loops add: O(n). |
| "It has a nested while, so it's O(n²)" | Count total pointer movement. If the inner pointer never resets, it's O(n) (Rule 7). |
| Calling O(n + m) "O(n)" | Keep independent inputs separate. |
| Forgetting the recursion stack in space complexity | Depth × frame size. Recursive DFS on a skewed tree is O(n) space. |
| Saying "O(1)" for `x in list` or `s[1:]` | Know your built-ins (§2.11). |
| "O(1) means fast" | It means *doesn't grow*. A 50 ms network call is O(1). |
| Describing hash maps as "O(1)" without a qualifier | "O(1) average, O(n) worst case." |
| Confusing amortized with average | Amortized is a deterministic guarantee over a sequence. Average is about random inputs. |
| Ignoring string/key length | Sorting each of n words of length L inside a loop is O(n · L log L), not O(n). |

---

## 3. Drills

Put these in `drills/01/`.

**D1. Feel the growth (40 min)**
Type in this harness, then time five functions as n doubles:

```python
import random
import time

def bench(fn, sizes, repeat=3):
    """Return the best-of-`repeat` time for each n. Best-of reduces noise from other processes."""
    results = []
    for n in sizes:
        data = list(range(n))
        random.shuffle(data)
        best = float("inf")
        for _ in range(repeat):
            arg = data[:]                      # fresh copy (some functions mutate)
            t0 = time.perf_counter()
            fn(arg)
            best = min(best, time.perf_counter() - t0)
        results.append((n, best))
    for (n1, t1), (n2, t2) in zip(results, results[1:]):
        print(f"{fn.__name__:>12}  n={n2:>8}  t={t2:.5f}s  ratio={t2 / t1:.2f}")
    return results
```

Write these five functions, each taking a list `nums`:
- `constant`: return `nums[len(nums) // 2]`
- `logarithmic`: run your own `while` loop that halves `len(nums)` until it reaches 1 (count the steps)
- `linear`: sum with a `for` loop (not `sum()`)
- `linearithmic`: `sorted(nums)`
- `quadratic`: count the pairs `(i, j)` with `i < j` and `nums[i] < nums[j]` using two loops

Use `sizes = [1000, 2000, 4000, 8000]` for quadratic and `[10**5, 2 * 10**5, 4 * 10**5, 8 * 10**5]` for the rest. **Before running anything**, predict the ratio you'll see each time n doubles. Then run it and compare. Which ones are noisy, and why?

**D2. Watch amortized append happen (20 min)**
```python
import sys
nums = []
prev = sys.getsizeof(nums)
for i in range(200):
    nums.append(i)
    size = sys.getsizeof(nums)
    if size != prev:
        capacity = (size - sys.getsizeof([])) // 8   # 8 bytes per pointer on 64-bit
        print(f"len={len(nums):>4}  new capacity={capacity}")
        prev = size
```
1. Run it. What's the growth factor between consecutive capacities, roughly?
2. Extend it: for 10⁶ appends, count the total number of resizes and the total number of element copies (at each resize, the copies are `len(nums) - 1`). Divide the copies by 10⁶. Is it a constant? Compare it with the r/(r − 1) formula from §2.6.
3. Write a `FixedGrowthArray` class that wraps a Python list but simulates growth by +100 slots (just count the "copies" it would do). Plot or print the copies per append for n = 10³, 10⁴, 10⁵. What do you see?

**D3. Fix the traps (45 min)**
Each function is correct but slow. For each one: (a) state its current complexity, (b) rewrite it, (c) state the new complexity, and (d) time both at the given n with the D1 harness.

```python
# 1. n = 20_000
def common_ids(a: list[int], b: list[int]) -> list[int]:
    return [x for x in a if x in b]

# 2. n = 50_000 (graph: node i connects to i+1)
def bfs_order(n: int) -> list[int]:
    queue, seen, order = [0], {0}, []
    while queue:
        node = queue.pop(0)
        order.append(node)
        nxt = node + 1
        if nxt < n and nxt not in seen:
            seen.add(nxt)
            queue.append(nxt)
    return order

# 3. n = 50_000 lines. Newest log line first
def render_newest_first(lines: list[str]) -> str:
    out = ""
    for line in lines:
        out = line + "\n" + out
    return out

# 4. n = 20_000
def running_totals(nums: list[int]) -> list[int]:
    return [sum(nums[:i + 1]) for i in range(len(nums))]

# 5. n = 20_000. Remove duplicates, keeping the first occurrence order
def dedupe(nums: list[int]) -> list[int]:
    out = []
    for x in nums:
        if x not in out:
            out.append(x)
    return out
```

Bonus: rewrite #3 with `out += line + "\n"` (appending, not prepending) and time it. Is it slow? Why not? (§2.11, Trap 3.) Would you rely on that in an interview?

**D4. Predict the complexity (45 min)**
For each snippet, write the **time** and **auxiliary space** complexity, with a one-line justification. n = `len(nums)` unless stated otherwise. Commit to every answer before you check the key.

```python
# 1
def f1(nums):
    total = 0
    for x in nums: total += x
    for x in nums: total -= x
    return total

# 2
def f2(nums):
    count = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == 0:
                count += 1
    return count

# 3
def f3(n):
    i = 1
    while i < n:
        i *= 3

# 4
def f4(n):
    for i in range(n):
        j = 1
        while j < n:
            j *= 2

# 5: a has n items, b has m items
def f5(a, b):
    return [(x, y) for x in a for y in b]

# 6
def f6(nums):
    for x in nums:
        for d in range(4):
            pass

# 7: nums are non-negative
def f7(nums, limit):
    left = total = best = 0
    for right in range(len(nums)):
        total += nums[right]
        while total > limit:
            total -= nums[left]
            left += 1
        best = max(best, right - left + 1)
    return best

# 8
def f8(n):
    for i in range(1, n + 1):
        for j in range(0, n, i):
            pass

# 9
def f9(s: str):
    out = ""
    for ch in s:
        out = ch + out
    return out

# 10
def f10(nums):
    return [x for x in nums if nums.count(x) == 1]

# 11
def f11(n):
    if n <= 1:
        return 1
    return f11(n - 1) + f11(n - 1)

# 12
def f12(n):
    if n <= 1:
        return 1
    return f12(n // 2) + f12(n // 2)

# 13
def f13(nums):
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    return f13(nums[:mid]) + f13(nums[mid:])

# 14
def f14(nums, target):          # nums is sorted
    if not nums:
        return False
    mid = len(nums) // 2
    if nums[mid] == target:
        return True
    if nums[mid] < target:
        return f14(nums[mid + 1:], target)
    return f14(nums[:mid], target)

# 15
def f15(n):
    i = n
    while i > 0:
        for j in range(i):
            pass
        i //= 2

# 16
def f16(n):
    i = 1
    while i * i <= n:
        i += 1

# 17: n words, each of length at most L
from collections import defaultdict
def f17(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())

# 18: grid is m x n
from functools import cache
def f18(m, n):
    @cache
    def paths(r, c):
        if r == 0 or c == 0:
            return 1
        return paths(r - 1, c) + paths(r, c - 1)
    return paths(m - 1, n - 1)
# 18b: the same function WITHOUT @cache?
```

**D5. Recursion trees by hand (30 min)**
On paper, draw the recursion tree for each, write the work per level, and sum it:
1. `fib(6)` (naive). Count the total calls. (Hint: the number of calls satisfies C(n) = C(n−1) + C(n−2) + 1.)
2. `merge_sort` on 8 elements: label each level with its total work.
3. This function:
   ```python
   def g(n):
       if n <= 1:
           return
       for _ in range(n):
           pass
       g(n // 2)
   ```
4. Tower of Hanoi: `hanoi(n)` moves n−1 disks, moves one disk, then moves n−1 disks again. Write the recurrence and solve it. How many moves for n = 20?

**D6. Constraints → target complexity (20 min)**
For each, state the target complexity and the technique it hints at:
1. `1 <= nums.length <= 10^5`. Return true if any two numbers sum to `target`.
2. `1 <= nums.length <= 15`. Return all subsets whose sum is divisible by 3.
3. `1 <= text1.length, text2.length <= 1000`. Return the length of their longest common subsequence.
4. `1 <= n <= 10^9`. Return the integer square root of n.
5. `1 <= piles.length <= 10^4`, `1 <= piles[i] <= 10^9`. Return the minimum eating speed to finish within `h` hours.
6. `1 <= nums.length <= 8`. Return all permutations.
7. `1 <= nums.length <= 10^5`, `0 <= nums[i] <= 100`. Return nums sorted.
8. An array of `n <= 5 * 10^4` integers, and `q <= 5 * 10^4` queries `sum(nums[l..r])`. The array never changes.

**D7. Simulate N+1 (30 min)**
```python
import time

RTT = 0.002   # 2 ms simulated network round trip
USERS = {i: {"id": i, "name": f"user{i}"} for i in range(1000)}

def query_user(uid: int) -> dict:
    time.sleep(RTT)
    return USERS[uid]

def query_users(uids: list[int]) -> list[dict]:
    time.sleep(RTT)                      # one round trip, whatever the batch size
    return [USERS[u] for u in uids]
```
1. Write `attach_naive(orders)`, which calls `query_user` per order, and `attach_batched(orders)`, which calls `query_users` once with the unique ids, then joins with a dict.
2. Time both for 50, 100, 200, and 400 orders (`orders = [{"id": i, "user_id": i % 300} for i in range(k)]`). Print a table.
3. Write a third version that's batched but joins with `next(u for u in users if u["id"] == o["user_id"])` instead of a dict. What's its CPU complexity? At what scale would it start to matter compared with the round trips?
4. In one sentence each: what is n, and what operation are you counting, for each version?

---

## 4. Build: `bigo_lab`, an empirical complexity checker (2–2.5 hrs)

Build a small tool that **measures** how a function scales and **guesses its Big-O class**. Then use it to verify the cost table from Module 00 against reality. You'll trust the table more once you've confirmed it yourself, and you'll get a feel for how noisy real measurements are.

Create `drills/01/bigo_lab.py`.

**Part 1: measurement**

```python
def measure(fn, make_input, sizes: list[int], repeat: int = 5) -> list[tuple[int, float]]:
    """For each n: build the input with make_input(n) (NOT timed), then time fn(input).
    Return the best of `repeat` runs per n."""
```

Requirements:
- Build the input outside the timed region.
- Rebuild (or copy) the input for every repeat if `fn` mutates it.
- Use `time.perf_counter()` and take the **minimum** of the repeats (the min is the least noisy estimate of the true cost).
- Call `gc.disable()` during timing and `gc.enable()` afterwards (in a `try/finally`).

**Part 2: estimation**

```python
MODELS = {
    "O(1)":       lambda n: 1,
    "O(log n)":   lambda n: math.log2(n),
    "O(n)":       lambda n: n,
    "O(n log n)": lambda n: n * math.log2(n),
    "O(n^2)":     lambda n: n ** 2,
    "O(n^3)":     lambda n: n ** 3,
}

def estimate(results: list[tuple[int, float]]) -> str:
    """Return the name of the model that best fits the measurements."""
```

The approach: if t(n) ≈ c · f(n), then `t / f(n)` should be roughly **constant** across all n for the right model. For each model, compute `ratios = [t / f(n) for n, t in results]`, then a spread measure such as `max(ratios) / min(ratios)`. Pick the model with the smallest spread.

**Part 3: experiments**
Write at least these experiments, each with the complexity you **expect** (as a single operation or as a loop of n operations):

| Experiment | What's timed | Expected |
|---|---|---|
| `list_in` | `n - 1 in lst` (worst case: last element) | O(n) |
| `set_in` | `n - 1 in st` | O(1) |
| `drain_pop0` | `while lst: lst.pop(0)` | O(n²) |
| `drain_popleft` | `while dq: dq.popleft()` | O(n) |
| `sort_random` | `sorted(random_list)` | O(n log n) |
| `sort_sorted` | `sorted(already_sorted_list)` | O(n) (Timsort detects the run) |
| `heapify` | `heapq.heapify(lst)` | O(n) |
| `push_all` | n × `heappush` | O(n log n) |
| `insort_all` | n × `bisect.insort` | O(n²) |
| `join_build` | `"".join(parts)` | O(n) |
| `prepend_build` | `s = "x" + s`, n times | O(n²) |
| `slice_copy` | `lst[1:]` | O(n) |

Print a report:

```
experiment       expected     estimated    match
list_in          O(n)         O(n)         ✓
set_in           O(1)         O(1)         ✓
drain_pop0       O(n^2)       O(n^2)       ✓
sort_random      O(n log n)   O(n)         ✗  ← see notes
...
```

**Part 4: tests**
In `tests/test_bigo_lab.py`, test `estimate()` with **synthetic** inputs where you control the answer exactly. For example, `[(n, 3e-9 * n * n) for n in (1000, 2000, 4000, 8000)]` must come out as `"O(n^2)"`. Test every model, so the estimator is tested separately from the noisy timing.

**Part 5: write up**
At the top of `bigo_lab.py`, write a short comment block answering:
1. Which experiments didn't match, and why? (Expect O(n) vs O(n log n) to be hard to tell apart: over a 16× range of n, log n changes by only about 20%. That isn't a bug in your tool. It's a real property of log factors, and it's why O(n log n) "feels" linear in production.)
2. Which ranges of n gave clean results? Why are tiny sizes unreliable?
3. What does `sort_sorted` tell you about Timsort?

Commit it. You'll reuse `measure()` in later modules to check your own data structures.

---

## 5. Checkpoint

Answer these out loud, without notes. If you get stuck on one, re-read that section.

1. Explain Big-O to a junior developer in two sentences, then give the formal definition. What do Ω and Θ mean, and which one do people actually mean when they say "Big-O"?
2. Why do we drop constants and lower-order terms? Give a real situation where the constant matters more than the growth rate.
3. What are the average and worst cases for hash map lookup and for quicksort, and what causes the worst case in each? Which do you state in an interview?
4. Prove that `list.append` is O(1) amortized using the doubling argument. How is amortized different from average? Why might it still cause a latency spike in a request handler, and how does Redis avoid that?
5. What counts toward space complexity? What's the space complexity of recursive DFS on a balanced tree versus a skewed one?
6. A sliding-window function has a `while` loop inside a `for` loop. Why can it still be O(n)?
7. Draw (in the air) the recursion trees for naive Fibonacci and merge sort. Derive both complexities. What does memoization do to Fibonacci, and why?
8. Name five Python operations that look cheap but are O(n), and the fix for each.
9. A problem says `n <= 10^5`. What complexity are you aiming for, and why? What about `n <= 20`? What about values up to `10^9` where you're asked for a "minimum capacity"?
10. Explain N+1 queries, a full table scan versus an index lookup, and a hash join versus a nested-loop join, in Big-O terms. Which DSA problem is a hash join?

---

## 6. Resources

**Required**
- *Grokking Algorithms* (2nd ed.), Chapter 1: binary search and Big-O, with the best visual intuition for log n anywhere
- *Cracking the Coding Interview* (Gayle Laakmann McDowell), Chapter VI "Big O": the best interview-focused treatment, with a dozen worked examples (amortized time, recursive runtimes, "drop the non-dominant terms"). If you only read one thing besides this module, read this.

**Recommended**
- [Python wiki: TimeComplexity](https://wiki.python.org/moin/TimeComplexity), which you should already have bookmarked from Module 00
- MIT 6.006 *Introduction to Algorithms* (OCW, Spring 2020), Lectures 1–2, if you want the rigorous version, with the formal model of computation and dynamic array analysis

---

## Answer key

Don't open these until you've committed to your answers.

<details>
<summary>D1: expected ratios when n doubles</summary>

| Function | Expected ratio | Notes |
|---|---|---|
| `constant` | ~1.0 | Very noisy: the times are microseconds, close to timer resolution |
| `logarithmic` | ~1.0 (very slightly above) | log₂(2n) / log₂(n) is about 1.05–1.1 at these sizes. It's indistinguishable from O(1) by timing alone |
| `linear` | ~2.0 | Usually the cleanest result |
| `linearithmic` | ~2.1–2.2 in theory | In practice anywhere from ~1.8 to ~2.7, because cache effects at larger n add noise. Hard to tell apart from linear |
| `quadratic` | ~4.0 | Very clear |

The lesson: timing confirms the *big* differences (1 vs n vs n²) easily, but log factors are almost invisible. You need analysis, not just measurement.
</details>

<details>
<summary>D2: amortized append</summary>

1. Capacities go 4, 8, 16, 24, 32, 40, 52, 64, 76, 92, 108, ... The growth factor tends toward about **1.125** (12.5% plus a small constant).
2. For 10⁶ appends on CPython 3.12: about **86 resizes** and about **8.4 copies per append**. It's a constant, and close to r/(r − 1) = 1.125/0.125 = 9. That's O(1) amortized.
3. With +100 growth, the copies per append grow **linearly with n** (about n/200): roughly 5 at n = 10³, 50 at n = 10⁴, and 500 at n = 10⁵. That's O(n) amortized per append, or O(n²) total. Additive growth fails.
</details>

<details>
<summary>D3: Fix the traps</summary>

1. **O(n · m) → O(n + m).** `b_set = set(b)`, then `[x for x in a if x in b_set]`.
2. **O(n²) → O(n).** Use `deque([0])` and `popleft()`. The rest is unchanged.
3. **O(n² · L) → O(n · L)**, where L is the line length. Collect `parts`, then `"\n".join(reversed(parts)) + "\n"` (or iterate `reversed(lines)`). Bonus: `out += ...` (appending) is often fast in CPython because of the in-place resize optimization, but that's an implementation detail. In an interview, use `join` and say why.
4. **O(n²) → O(n).** Keep a running total: `total += x; out.append(total)` (or `itertools.accumulate(nums)`).
5. **O(n²) → O(n).** Keep a `seen` set alongside `out`: `if x not in seen: seen.add(x); out.append(x)`. (Or `list(dict.fromkeys(nums))`, which works because dicts keep insertion order.)
</details>

<details>
<summary>D4: Predict the complexity</summary>

| # | Time | Aux. space | Why |
|---|---|---|---|
| 1 | O(n) | O(1) | Two sequential loops: n + n |
| 2 | O(n²) | O(1) | All pairs: n(n−1)/2 |
| 3 | O(log n) | O(1) | i triples each step: log₃ n steps (bases don't matter) |
| 4 | O(n log n) | O(1) | n outer iterations × log₂ n inner |
| 5 | O(n · m) | O(n · m) | Every pair is materialized in the output (O(1) aux if you don't count the output) |
| 6 | O(n) | O(1) | The inner loop is a constant 4 |
| 7 | O(n) | O(1) | `left` only moves forward, at most n times in total (Rule 7) |
| 8 | O(n log n) | O(1) | n/1 + n/2 + ... + n/n = n · Hₙ ≈ n ln n (harmonic) |
| 9 | O(n²) | O(n) | Prepending copies the whole string each time: 1 + 2 + ... + n |
| 10 | O(n²) | O(n) | `count` is O(n), called n times. The output can be up to n |
| 11 | O(2ⁿ) | O(n) | Two branches, depth n: 2ⁿ calls. The stack is n deep |
| 12 | O(n) | O(log n) | T(n) = 2T(n/2) + O(1): 1 + 2 + 4 + ... + n < 2n calls. Depth log n |
| 13 | O(n log n) | O(n) | T(n) = 2T(n/2) + O(n) (slicing and concatenation at every level). Live slices along the current path total < 2n |
| 14 | O(n) | O(n) | T(n) = T(n/2) + O(n): n + n/2 + ... < 2n. The slicing ruined the binary search. Fix with indices: O(log n) time, O(log n) stack (O(1) iterative) |
| 15 | O(n) | O(1) | n + n/2 + n/4 + ... < 2n |
| 16 | O(√n) | O(1) | Stops when i > √n |
| 17 | O(n · L log L) | O(n · L) | Sorting each word costs L log L. Storing the keys and groups is n · L |
| 18 | O(m · n) | O(m · n) | Each (r, c) is computed once with O(1) work. The cache holds m · n entries; the stack depth is up to m + n |
| 18b | O(2^(m+n)) | O(m + n) | Without the cache, every call branches twice and the depth is up to m + n. (Tighter: it's proportional to the answer itself, C(m+n−2, m−1), but O(2^(m+n)) is an acceptable upper bound.) |
</details>

<details>
<summary>D5: Recursion trees</summary>

1. **`fib(6)`:** C(0) = C(1) = 1, C(2) = 3, C(3) = 5, C(4) = 9, C(5) = 15, **C(6) = 25 calls**. The call count grows like φⁿ, which is O(2ⁿ) as an upper bound.
2. **Merge sort, n = 8:** level 0 does 8 work, level 1 does 4 + 4 = 8, level 2 does 2 + 2 + 2 + 2 = 8, and level 3 is 8 leaves of size 1. That's log₂ 8 = 3 levels of merging at 8 each: **24**, which matches n log₂ n = 8 × 3. O(n log n).
3. **`g(n)`:** n + n/2 + n/4 + ... + 1 < 2n → **O(n) time**, with a recursion depth of log n → **O(log n) space**. (One branch per call, so the halving work forms a geometric series.)
4. **Hanoi:** T(n) = 2T(n−1) + 1, with T(1) = 1, gives **T(n) = 2ⁿ − 1**. For n = 20, that's **1,048,575 moves**. O(2ⁿ).
</details>

<details>
<summary>D6: Constraints → target complexity</summary>

1. **O(n) or O(n log n).** A hash set (O(n)), or sort plus two pointers (O(n log n)). O(n²) = 10¹⁰ is too slow.
2. **O(n · 2ⁿ).** 2¹⁵ = 32,768 subsets × 15 is about 5 × 10⁵. Use backtracking or bitmask enumeration.
3. **O(n · m) = 10⁶.** 2D dynamic programming.
4. **O(log n).** Binary search on the answer in [0, n], about 30 steps. (Or Newton's method.) You can't loop to 10⁹ in Python.
5. **O(n log V)**, with V = 10⁹. That's **binary search on the answer** over speeds 1..max(piles), about 30 iterations × 10⁴ = 3 × 10⁵.
6. **O(n · n!).** 8! = 40,320, × 8 is about 3 × 10⁵. Backtracking is fine.
7. **O(n + k)**, with k = 101. A **counting sort** beats O(n log n), because the values are tiny.
8. **O(n + q)** with **prefix sums**: precompute once in O(n), then answer each query in O(1). Brute force is O(n · q) = 2.5 × 10⁹, which is too slow.
</details>

<details>
<summary>D7: Simulated N+1</summary>

1–2. Naive: about `k × 2 ms`. That's ~100 ms for 50, ~200 ms for 100, ~400 ms for 200, and ~800 ms for 400 (plus sleep overhead, which is usually slightly more). Batched: about 2 ms flat, whatever k is.

3. The batched version with the `next(...)` scan is **O(k · u)** CPU, where k is the number of orders and u is the number of unique users (≤ 300 here): 400 × 300 = 1.2 × 10⁵ comparisons, which takes a few milliseconds in Python. That's already comparable to the round trip. With 10⁴ orders and 10⁴ users it would be 10⁸ comparisons, about 10 seconds, so the in-memory join would dominate completely. The dict join is O(k + u).

4. **Naive:** n = the number of orders, counting **round trips**, so O(n). **Batched with a dict:** O(1) round trips and O(n + u) CPU. **Batched with a scan:** O(1) round trips, but O(n · u) CPU. You fixed the network and reintroduced a nested-loop join in memory.
</details>
