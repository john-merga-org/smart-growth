# Data Structures & Algorithms: Backend Engineer → Interview-Ready

**Student profile:** Strong backend engineer (TypeScript, Node.js, Express). Has dabbled in Python and Go. DSA experience is close to zero, so we start from scratch on DSA, but not on programming.
**Target:** Two things at once. (1) Real understanding: you know how each data structure works inside, what it costs, and when to reach for it. (2) Passing FAANG-level coding interviews: medium problems in ~25 minutes, hards attempted with a clear plan, explained out loud the whole time.
**Pace:** 4–5 hrs/week, alongside the 10-hr/week frontend course. About **49 weeks (~11 months)** of planned work. Budget **~12 months** once you count sick weeks, holidays, and crunch at work.
**Language:** Python. Module 00 gets you fluent enough for DSA, fast.

---

## Be honest about the timeline

4–5 hours a week is enough, but it isn't a lot. Here's what to expect:

| By about... | You should be able to... |
|---|---|
| Month 3 (end of Phase 1) | Solve most easy problems alone and recognize the basic patterns: hashing, two pointers, sliding window, prefix sums |
| Month 6 (end of Phase 2) | Solve easy problems quickly and about half of mediums alone. Explain how every core data structure works internally |
| Month 9 (end of Phase 3) | Solve most mediums in ~30–35 min, including graphs and DP. Pass a mid-level interview on a good day |
| Month 11–12 (end of Phase 4) | Solve mediums in ~25 min while talking, make real progress on hards, and pass FAANG-style mocks consistently |

You can't compress this much by working harder in a single week. DSA skill comes from **spaced exposure over months**: the same patterns showing up again and again until recognizing them is automatic. Consistency matters more than intensity. Five hours every week beats fifteen hours once a month.

If the frontend course finishes before this one does, move some of those hours over here. At 8–10 hrs/week, Phase 3 and Phase 4 take about half as long.

---

## The core idea of this course

You already think like an engineer. What you're missing is three things:

1. **A cost model.** On the backend you know instinctively that a full table scan is bad and an indexed lookup is good, and that N+1 queries kill you. DSA is that same instinct, applied to in-memory code. Module 01 (Big-O) is the foundation for everything else, so don't rush it.
2. **A pattern library.** Interview problems aren't 2,000 unique puzzles. They're about 20 patterns (two pointers, sliding window, BFS, top-k with a heap, DP on subsequences...) in different costumes. You learn the patterns, then train yourself to recognize them from the problem statement.
3. **Data structures from the inside.** You'll **implement every data structure yourself before using the library version.** You've used `Map`, arrays, and Redis for years as black boxes. Once you've built a hash map with resizing yourself, you'll never wonder again why it's "O(1) on average".

**We learn the pattern before grinding problems.** Doing 300 random LeetCode problems without understanding the patterns is the most common way people fail at this. Every module teaches one pattern or structure, then gives you a short, specific list of problems for it.

---

## Roadmap

### Phase 1: Foundations (Weeks 1–12)
*Goal: read and write Python fluently, analyze the complexity of any code you write, and solve easy problems with the basic array and hashing patterns.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 00 | [Python for DSA (for a TypeScript dev)](phase-1-foundations/00-python-for-dsa.md) | 1 | You write idiomatic Python and know what every built-in operation costs |
| 01 | [Big-O and Complexity Analysis](phase-1-foundations/01-big-o-complexity.md) | 1.5 | You can state the time and space complexity of any code, including recursion, and pick a target complexity from the constraints |
| 02 | Arrays and strings: dynamic arrays, in-place edits, 2D grids, string building | 1.5 | You can manipulate arrays and matrices in place and know why string building needs care |
| 03 | Hash maps and sets: hashing, collisions, resizing, counting, grouping | 1.5 | You've built your own hash map, and "can a hash map make this O(n)?" is your first instinct |
| 04 | Two pointers: opposite ends, fast/slow, read/write pointers | 1.5 | You turn O(n²) pair searches on sorted data into O(n) |
| 05 | Sliding window: fixed and variable windows | 1.5 | You solve "longest/shortest subarray or substring such that..." problems in O(n) |
| 06 | Prefix sums: 1D, 2D, prefix sum + hash map | 1 | You answer range queries in O(1) and count subarrays with a target sum |
| 07 | Recursion basics: call stack, base cases, recursion on lists and strings | 1.5 | You trust recursion, can trace it, and know its stack cost |
| 🏁 | **Milestone 1:** Phase 1 timed set + `dsalib` started (DynamicArray, HashMap) | 1 | You can prove the foundations hold under time pressure |

### Phase 2: Core Data Structures (Weeks 13–24)
*Goal: implement every core data structure from scratch, and solve easy and medium problems that use them.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 08 | Linked lists: singly and doubly linked, dummy nodes, reversal, fast/slow pointers | 1.5 | Pointer manipulation without bugs. You can reverse a list in your sleep |
| 09 | Stacks and queues: deque, ring buffer, monotonic stack, monotonic queue | 1.5 | You recognize "next greater element" problems and solve them in O(n) |
| 10 | Binary search: the template, boundaries, rotated arrays, **binary search on the answer** | 2 | Correct binary search on the first try, and you can spot hidden binary search problems |
| 11 | Sorting: merge sort, quicksort, quickselect, counting/bucket sort, stability, custom keys | 1.5 | You know how sorting works and when O(n log n) can be beaten |
| 12 | Trees and BSTs: traversals (recursive and iterative), BFS by level, BST operations, tree DP basics | 2.5 | Tree problems become "what does each node return to its parent?" |
| 13 | Heaps and priority queues: binary heap internals, top-k, k-way merge, two heaps | 1.5 | You've built a heap and use one whenever you need "the best item so far" |
| 🏁 | **Milestone 2:** `dsalib` core complete with tests + mixed timed set + first mock interview | 1.5 | Your own data structure library, and your first interview under pressure |

### Phase 3: Core Algorithms (Weeks 25–39)
*Goal: handle the topics that separate "can code" from "passes interviews": backtracking, graphs, and DP.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 14 | Recursion and backtracking: subsets, permutations, combinations, pruning, grids | 2 | One template that solves every "generate all..." problem |
| 15 | Graphs I: representations, BFS/DFS, grids as graphs, cycle detection, topological sort | 2.5 | You model problems as graphs and traverse them correctly |
| 16 | Graphs II: union-find, Dijkstra, multi-source BFS, shortest paths on grids | 1.5 | You pick the right shortest-path and connectivity tool |
| 17 | Dynamic programming I: memoization → tabulation, 1D DP, state design | 2 | A repeatable recipe: state → recurrence → base case → order → optimize space |
| 18 | Dynamic programming II: 2D grids, knapsack (0/1 and unbounded), subsequences (LCS, LIS, edit distance), interval DP | 3 | You can classify a DP problem and write the recurrence before coding |
| 19 | Greedy: exchange arguments, when greedy works and when it fails | 1.5 | You can justify a greedy choice or know when to reach for DP instead |
| 20 | Intervals: sorting by start/end, merging, sweep line, meeting rooms | 1 | Interval problems reduce to "sort, then sweep" |
| 🏁 | **Milestone 3:** Graphs in `dsalib` + LeetCode contest-style timed sets + 2 mock interviews | 1.5 | Mid-level interview ready |

### Phase 4: Advanced + Interview Mastery (Weeks 40–49)
*Goal: cover the remaining topics, then turn knowledge into consistent interview performance.*

| # | Module | Weeks | Key outcome |
|---|--------|-------|-------------|
| 21 | Tries: prefix trees, autocomplete, word search | 1 | You can build a trie from scratch in 5 minutes |
| 22 | Bit manipulation: masks, XOR tricks, bitmask state | 0.5 | Bit problems stop looking like magic |
| 23 | Segment trees and Fenwick trees (light) | 1 | You know when range queries with updates need them, and can write a Fenwick tree |
| 24 | Advanced graphs: MST (Kruskal, Prim), Bellman-Ford, Floyd-Warshall overview | 1 | The full shortest-path and spanning-tree toolbox |
| 25 | Design problems: LRU, LFU, rate limiters, iterators, time-based key-value store | 1.5 | Backend-flavored problems become your strongest category |
| 26 | Interview mastery: communication framework, timed practice, mock interviews, review | 3 | You perform consistently, not just on good days |
| 🏆 | **Capstone:** "mini-Redis" in Python (TTL via heap, LRU eviction, sliding-window rate limiter, prefix scan via trie) + 3 consecutive passing mocks | 2 | You've proven both real skill and interview readiness |

---

## Milestones in detail

**🏁 Milestone 1 (end of Phase 1)**
- **Timed set:** 10 unseen problems covering Modules 02–07 (6 easy, 4 medium). Easy ≤ 15 min, medium ≤ 35 min. Pass: 7/10 solved alone within the time.
- **`dsalib` started:** a Git repo with `DynamicArray` (with resizing) and `HashMap` (with collision handling and resizing), plus pytest tests that compare them against `list` and `dict`.

**🏁 Milestone 2 (end of Phase 2)**
- **`dsalib` core:** `SinglyLinkedList`, `Deque` (doubly linked), `RingBufferQueue`, `Stack`, `MinStack`, `BST` (insert, delete, search, all traversals), `BinaryHeap`, merge sort, quicksort, counting sort, and binary-search helpers (`lower_bound`, `upper_bound`). Every structure has tests plus a docstring table of its operation costs.
- **Timed set:** 12 problems mixed from Phases 1–2, at least 6 medium. Medium ≤ 30 min. Pass: 9/12.
- **First mock interview:** with a peer, on a free peer-mock site, or recorded solo while you talk out loud. Score yourself with the rubric in Module 26 (we'll give you a draft at the milestone). Passing is optional here. The point is to see where you break under pressure.

**🏁 Milestone 3 (end of Phase 3)**
- **`dsalib` graphs:** `Graph` (adjacency list), BFS, DFS, topological sort (Kahn's), `UnionFind` (path compression + union by rank), Dijkstra.
- **Timed sets:** three sets of 2 mediums in 45 min (the LeetCode contest format). Try at least one live LeetCode weekly contest.
- **Two mock interviews** with someone else asking. Pass: "lean hire" or better on both.

**🏆 Capstone (end of Phase 4)**
- **mini-Redis:** an in-memory key-value store in Python with `GET/SET/DEL`, `EXPIRE` (a heap of expiry times), LRU eviction at max capacity (a hash map + doubly linked list you wrote yourself), a sliding-window rate limiter per client, and `SCAN prefix` backed by a trie. Every operation has a documented complexity and tests.
- **Interview gate:** all of NeetCode 150 solved, with ≥ 80% re-solvable cold. Then **3 consecutive passing mocks**, at least one of which includes a hard problem.

---

## How every module works

Each module file has the same structure:

1. **Why it matters**: the backend analogy, so you're mapping new ideas onto ones you already know.
2. **Concepts**: the lesson itself. Read it with an editor and a Python REPL open.
3. **Drills**: implementing things from scratch, predicting complexity, and short exercises. Answer keys are in collapsed blocks at the bottom. Don't open them until you've committed to an answer.
4. **Build**: a small, concrete project that uses the module's ideas. From Module 03 on, this usually means adding a structure to `dsalib`.
5. **Checkpoint**: questions you must answer *out loud without notes* before moving on. If you can't, re-read; don't skip ahead.
6. **Resources**: the best one or two sources per topic, not a list of twenty.

From Module 02 on, each module also has a **Problems** list: the NeetCode 150 problems for that pattern, plus a few extras.

---

## How to practice

This section matters as much as the content. Most people who fail at DSA prep fail because of *how* they practice, not because of what they study.

### The problem-solving framework (use it on every problem, starting now)

It's the same framework you'll use in interviews, so practice it from day one. That way it's automatic by the time it counts.

| Step | What you do | Time (for a medium) |
|---|---|---|
| 1. **Clarify** | Restate the problem. Ask about input size, value ranges, duplicates, empty input, negatives, whether it's sorted, and what to return when there's no answer | 2–3 min |
| 2. **Examples** | Work through one normal example and two edge cases *by hand*. Write them down, because they become your tests | 2–3 min |
| 3. **Brute force** | Say the obvious solution and its complexity, even if it's terrible. Now you have a baseline and something to fall back on | 2 min |
| 4. **Optimize** | Ask: what's repeated work? Which pattern fits? Can a hash map, sorting, or a heap help? What does the constraint (`n ≤ 10^5`) say about the target complexity? | 5–8 min |
| 5. **Code** | Write clean code with good names. Talk while you write | 10–12 min |
| 6. **Test** | Trace your examples through the *code* (not your intention). Then check the edge cases | 3–5 min |
| 7. **Complexity** | State the time and space complexity, and justify it | 1 min |

When practicing alone, **still say steps 1–4 out loud** (or write them as comments). It feels silly. Do it anyway.

### The 25-minute rule

- Work on a problem for **25–30 minutes**. If you have no workable approach by then, stop.
- Read **one hint** (the NeetCode video's first few minutes, or the LeetCode hints). Try for 10 more minutes.
- Still stuck? Read or watch the full solution until you understand **why** it works, not just what it does. Then close it.
- **Re-solve it from a blank file tomorrow**, without looking. Only that counts as "solved". Log it as `alone = n`.

Struggling for 2 hours isn't noble. Past about 30 minutes you learn very little, and you've spent time that could have gone to two more problems.

### Spaced repetition

Solving a problem once means almost nothing. Re-solving it cold a week later means you learned the pattern.

- Re-solve each problem at **+1, +3, +7, +14, and +30 days** after the first solve. Use the re-solve columns in [PROGRESS.md](PROGRESS.md).
- A re-solve counts if you solve it from a blank file in **≤ 15 minutes** without hints. If you fail, reset that problem's schedule to +1.
- Once a problem passes at +30 days, retire it. You own that pattern.
- Re-solves go in your **review session** each week. Cap it at about 4–5 re-solves per session, and do the most overdue first.

### Implement first, then use the library

For every data structure: **implement it from scratch → test it against Python's built-in → then use the built-in in problems.** You'll build your own linked list, stack, ring-buffer queue, hash map, BST, heap, trie, union-find, and LRU cache. They all go into one repo, `dsalib`, which becomes Milestone 2.

### Keep a mistakes log

Every time you get something wrong, log it in [PROGRESS.md](PROGRESS.md): an off-by-one error, a missed edge case, the wrong pattern, a Python gotcha, or a wrong complexity claim. Write the **rule** you take away from it ("empty input: always check `if not nums` first"). Re-read the log before every mock interview. Your mistakes repeat, and this is how you catch them.

### Rules
- **Turn off Copilot and other AI autocomplete in your DSA repo.** It will write the solution before you've had a chance to think. You can ask AI to *explain* a concept or give *one hint*, but never to write the solution.
- **No IDE run button until step 6.** In interviews you won't have one, so trace by hand first.
- **Write the complexity at the top of every solution file** as a comment. Every time.
- **Push everything to GitHub** (`dsa-journey`), so you have a visible record.

---

## The problem spine: NeetCode 150

Use **[NeetCode 150](https://neetcode.io/practice)** as the backbone. Every problem has a free video explanation. **Grind 75** is a good list to cross-check against in Phase 4; it overlaps heavily with NeetCode 150.

Here's how it maps onto the modules. "NC" means it's on the NeetCode 150 list. Each module file will give the exact order.

| Module | Problems (LeetCode #) |
|---|---|
| 00 Python | Warm-ups for syntax only: Concatenation of Array (1929), Contains Duplicate (217, NC), Valid Anagram (242, NC) |
| 02 Arrays & strings | Plus One (66, NC), Rotate Image (48, NC), Spiral Matrix (54, NC), Set Matrix Zeroes (73, NC), Encode and Decode Strings (271, NC), Longest Common Prefix (14), Rotate Array (189) |
| 03 Hash maps | Two Sum (1, NC), Group Anagrams (49, NC), Top K Frequent Elements (347, NC, with bucket sort), Valid Sudoku (36, NC), Longest Consecutive Sequence (128, NC), Happy Number (202, NC), Isomorphic Strings (205), Design HashMap (706) |
| 04 Two pointers | Valid Palindrome (125, NC), Two Sum II (167, NC), 3Sum (15, NC), Container With Most Water (11, NC), Trapping Rain Water (42, NC), Remove Duplicates from Sorted Array (26), Move Zeroes (283) |
| 05 Sliding window | Best Time to Buy and Sell Stock (121, NC), Longest Substring Without Repeating Characters (3, NC), Longest Repeating Character Replacement (424, NC), Permutation in String (567, NC), Minimum Window Substring (76, NC), Maximum Average Subarray I (643) |
| 06 Prefix sums | Range Sum Query - Immutable (303), Find Pivot Index (724), Product of Array Except Self (238, NC), Subarray Sum Equals K (560), Contiguous Array (525), Range Sum Query 2D - Immutable (304) |
| 07 Recursion basics | Fibonacci Number (509), Reverse String (344, recursively), Pow(x, n) (50, NC), Power of Two (231), Merge Two Sorted Lists (21, NC, recursively) |
| 08 Linked lists | Reverse Linked List (206, NC), Merge Two Sorted Lists (21, NC), Linked List Cycle (141, NC), Reorder List (143, NC), Remove Nth Node From End (19, NC), Copy List with Random Pointer (138, NC), Add Two Numbers (2, NC), Find the Duplicate Number (287, NC), Reverse Nodes in k-Group (25, NC) |
| 09 Stacks & queues | Valid Parentheses (20, NC), Min Stack (155, NC), Evaluate Reverse Polish Notation (150, NC), Daily Temperatures (739, NC), Car Fleet (853, NC), Largest Rectangle in Histogram (84, NC), Sliding Window Maximum (239, NC), Implement Queue using Stacks (232) |
| 10 Binary search | Binary Search (704, NC), Search a 2D Matrix (74, NC), Koko Eating Bananas (875, NC), Find Minimum in Rotated Sorted Array (153, NC), Search in Rotated Sorted Array (33, NC), Time Based Key-Value Store (981, NC), Capacity To Ship Packages (1011), Split Array Largest Sum (410), Median of Two Sorted Arrays (4, NC) |
| 11 Sorting | Sort an Array (912, merge sort and quicksort), Sort Colors (75), Merge Sorted Array (88), Kth Largest Element in an Array (215, NC, quickselect), Largest Number (179) |
| 12 Trees & BST | Invert Binary Tree (226), Maximum Depth (104), Diameter (543), Balanced Binary Tree (110), Same Tree (100), Subtree of Another Tree (572), LCA of a BST (235), Level Order Traversal (102), Right Side View (199), Count Good Nodes (1448), Validate BST (98), Kth Smallest in a BST (230), Construct Tree from Preorder and Inorder (105), Binary Tree Maximum Path Sum (124), Serialize and Deserialize (297): all NC |
| 13 Heaps | Kth Largest in a Stream (703, NC), Last Stone Weight (1046, NC), K Closest Points to Origin (973, NC), Task Scheduler (621, NC), Design Twitter (355, NC), Find Median from Data Stream (295, NC), Merge k Sorted Lists (23, NC) |
| 14 Backtracking | Subsets (78), Combination Sum (39), Permutations (46), Subsets II (90), Combination Sum II (40), Word Search (79), Palindrome Partitioning (131), Letter Combinations of a Phone Number (17), Generate Parentheses (22), N-Queens (51): all NC |
| 15 Graphs I | Number of Islands (200), Max Area of Island (695), Clone Graph (133), Pacific Atlantic Water Flow (417), Surrounded Regions (130), Course Schedule (207), Course Schedule II (210): all NC |
| 16 Graphs II | Rotting Oranges (994), Walls and Gates (286), Number of Connected Components (323), Graph Valid Tree (261), Redundant Connection (684), Network Delay Time (743), Word Ladder (127), Swim in Rising Water (778): all NC |
| 17 DP I | Climbing Stairs (70), Min Cost Climbing Stairs (746), House Robber (198), House Robber II (213), Decode Ways (91), Coin Change (322), Maximum Product Subarray (152), Word Break (139), Longest Increasing Subsequence (300): all NC |
| 18 DP II | Unique Paths (62), Longest Common Subsequence (1143), Partition Equal Subset Sum (416), Coin Change II (518), Target Sum (494), Longest Palindromic Substring (5), Palindromic Substrings (647), Best Time to Buy and Sell Stock with Cooldown (309), Edit Distance (72), Interleaving String (97), Longest Increasing Path in a Matrix (329), Distinct Subsequences (115), Burst Balloons (312), Regular Expression Matching (10): all NC |
| 19 Greedy | Maximum Subarray (53), Jump Game (55), Jump Game II (45), Gas Station (134), Hand of Straights (846), Merge Triplets (1899), Partition Labels (763), Valid Parenthesis String (678): all NC |
| 20 Intervals | Insert Interval (57), Merge Intervals (56), Non-overlapping Intervals (435), Meeting Rooms (252), Meeting Rooms II (253), Minimum Interval to Include Each Query (1851): all NC |
| 21 Tries | Implement Trie (208), Design Add and Search Words (211), Word Search II (212): all NC |
| 22 Bits | Single Number (136), Number of 1 Bits (191), Counting Bits (338), Reverse Bits (190), Missing Number (268), Sum of Two Integers (371), Reverse Integer (7): all NC |
| 23 Segment/Fenwick | Range Sum Query - Mutable (307), Count of Smaller Numbers After Self (315) |
| 24 Advanced graphs | Min Cost to Connect All Points (1584, NC), Cheapest Flights Within K Stops (787, NC), Reconstruct Itinerary (332, NC), Alien Dictionary (269, NC) |
| 25 Design | LRU Cache (146, NC), LFU Cache (460), Insert Delete GetRandom O(1) (380), Binary Search Tree Iterator (173), Flatten Nested List Iterator (341), Design Hit Counter (362), Logger Rate Limiter (359) |
| 26 Mastery | NeetCode 150 leftovers (Math & Geometry: 50, 43, 2013, ...), Grind 75 cross-check, LeetCode company-tagged lists, weekly contests |

That's about 200 problems in total, roughly 4–5 new problems a week plus re-solves. For FAANG prep, that's the right range. Depth (re-solving and understanding) beats breadth (more problems).

---

## Weekly rhythm (4–5 hrs)

Five sessions of about 50–60 minutes. Short, frequent sessions work better for DSA than one long weekend block, because spacing is the whole point.

| Session | What you do |
|---|---|
| **1. Learn** | Read the module's Concepts section with a REPL open. Watch the NeetCode video for the pattern |
| **2. Implement** | Build the data structure or pattern template from scratch, then do the drills |
| **3. Problems** | 2–3 new problems from the module list, using the full framework and the 25-minute rule |
| **4. Problems** | 2–3 more new problems. Re-solve anything you needed a solution for in session 3 |
| **5. Review** | Spaced-repetition re-solves (most overdue first), update the mistakes log, and the module Checkpoint when you're ready |

In 1.5-week modules, the extra half week goes into more problems and review. In Phase 4, sessions 1 and 2 turn into timed sets and mock interviews.

If you only get 3 sessions in a week, keep **Problems** and **Review** and push the module out by a week. Don't skip review.

---

## Repo layout

Create one repo, `dsa-journey`, and use it for everything:

```
dsa-journey/
├── dsalib/              # your data structure library (Milestones 1–3, Capstone)
├── tests/               # pytest tests for dsalib
├── drills/
│   ├── 00/
│   └── 01/
└── problems/
    ├── 03-hashing/
    │   └── 0001_two_sum.py   # complexity in a comment at the top
    └── ...
```

---

## Core resources (the short list)

| Area | Resource |
|------|----------|
| Problem spine and pattern videos | [NeetCode](https://neetcode.io) (the roadmap, NeetCode 150, and free video solutions) |
| Practice platform | [LeetCode](https://leetcode.com) |
| Intuition, gently | *Grokking Algorithms* (2nd ed.) by Aditya Bhargava. A short, illustrated book; read it alongside Phases 1–3 |
| Visualization | [VisuAlgo](https://visualgo.net): step through sorting, heaps, BSTs, graphs, and hash tables |
| Depth (optional) | *The Algorithm Design Manual* by Steven Skiena (practical) or *CLRS* (rigorous). Use them as references, not to read cover to cover |
| Python reference | [Python wiki: TimeComplexity](https://wiki.python.org/moin/TimeComplexity) and the [`collections`](https://docs.python.org/3/library/collections.html) docs |
| Mock interviews (Phase 3+) | [Exponent peer mocks](https://www.tryexponent.com/practice) (free, peer-to-peer; formerly Pramp) or [interviewing.io](https://interviewing.io) (paid, with real FAANG interviewers) |

Track your progress in [PROGRESS.md](PROGRESS.md).
